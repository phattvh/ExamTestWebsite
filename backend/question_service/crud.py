from bson import ObjectId
from datetime import datetime
from database import db_instance

# Helper to convert MongoDB document to dict suitable for Pydantic
def serialize_doc(doc):
    if not doc:
        return None
    # Đổi tên "_id" -> "id" ngay tại đây để nhất quán với endpoint GET /{id} (đi qua
    # Pydantic model QuestionResponse, alias "_id" -> "id" tự động). Trước đây hàm này
    # chỉ stringify _id mà không đổi tên, khiến endpoint danh sách (GET /) trả về "_id"
    # còn endpoint xem 1 câu hỏi trả "id" — 2 hình dạng khác nhau cho cùng 1 loại dữ liệu,
    # buộc frontend phải tự đoán "row.id || row._id" ở nhiều nơi.
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    if "category_id" in doc and doc["category_id"]:
        doc["category_id"] = str(doc["category_id"])
    return doc

# --- Questions CRUD ---
async def create_question(question_data: dict):
    if "category_id" in question_data and question_data["category_id"]:
        question_data["category_id"] = ObjectId(question_data["category_id"])
    
    question_data["created_at"] = datetime.utcnow()
    question_data["updated_at"] = datetime.utcnow()
    
    result = await db_instance.db.questions.insert_one(question_data)
    new_doc = await db_instance.db.questions.find_one({"_id": result.inserted_id})
    return serialize_doc(new_doc)

async def create_questions_bulk(questions_data: list[dict]):
    for q in questions_data:
        if "category_id" in q and q["category_id"]:
            q["category_id"] = ObjectId(q["category_id"])
        q["created_at"] = datetime.utcnow()
        q["updated_at"] = datetime.utcnow()
    
    result = await db_instance.db.questions.insert_many(questions_data)
    
    # Return count of inserted
    return len(result.inserted_ids)

async def get_questions(skip: int = 0, limit: int = 10, filters: dict = None):
    query = {}
    if filters:
        if "subject" in filters and filters["subject"]:
            query["metadata.subject"] = filters["subject"]
        if "difficulty" in filters and filters["difficulty"]:
            query["metadata.difficulty"] = filters["difficulty"]
        if "type" in filters and filters["type"]:
            query["type"] = filters["type"]
        if "category_id" in filters and filters["category_id"]:
            query["category_id"] = ObjectId(filters["category_id"])
            
    cursor = db_instance.db.questions.find(query).skip(skip).limit(limit)
    questions = await cursor.to_list(length=limit)
    total = await db_instance.db.questions.count_documents(query)
    
    return total, [serialize_doc(q) for q in questions]

async def get_question(question_id: str):
    if not ObjectId.is_valid(question_id):
        return None
    doc = await db_instance.db.questions.find_one({"_id": ObjectId(question_id)})
    return serialize_doc(doc)

async def update_question(question_id: str, update_data: dict):
    if not ObjectId.is_valid(question_id):
        return None
        
    if "category_id" in update_data and update_data["category_id"]:
        update_data["category_id"] = ObjectId(update_data["category_id"])
        
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db_instance.db.questions.update_one(
        {"_id": ObjectId(question_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 1:
        doc = await db_instance.db.questions.find_one({"_id": ObjectId(question_id)})
        return serialize_doc(doc)
    return None

async def delete_question(question_id: str):
    if not ObjectId.is_valid(question_id):
        return False
    result = await db_instance.db.questions.delete_one({"_id": ObjectId(question_id)})
    return result.deleted_count == 1

async def bulk_delete_questions(question_ids: list[str]) -> int:
    valid_ids = [ObjectId(qid) for qid in question_ids if ObjectId.is_valid(qid)]
    if not valid_ids:
        return 0
    result = await db_instance.db.questions.delete_many({"_id": {"$in": valid_ids}})
    return result.deleted_count

async def bulk_update_category(question_ids: list[str], category_id: str = None) -> int:
    valid_ids = [ObjectId(qid) for qid in question_ids if ObjectId.is_valid(qid)]
    if not valid_ids:
        return 0
    cat_obj = ObjectId(category_id) if category_id and ObjectId.is_valid(category_id) else None
    result = await db_instance.db.questions.update_many(
        {"_id": {"$in": valid_ids}},
        {"$set": {"category_id": cat_obj, "updated_at": datetime.utcnow()}}
    )
    return result.modified_count

# --- Categories CRUD ---
async def create_category(category_data: dict):
    category_data["created_at"] = datetime.utcnow()
    result = await db_instance.db.categories.insert_one(category_data)
    new_doc = await db_instance.db.categories.find_one({"_id": result.inserted_id})
    return serialize_doc(new_doc)

async def get_categories(skip: int = 0, limit: int = 100):
    cursor = db_instance.db.categories.find({}).skip(skip).limit(limit)
    categories = await cursor.to_list(length=limit)
    total = await db_instance.db.categories.count_documents({})
    return total, [serialize_doc(c) for c in categories]

async def get_category(category_id: str):
    if not ObjectId.is_valid(category_id):
        return None
    doc = await db_instance.db.categories.find_one({"_id": ObjectId(category_id)})
    return serialize_doc(doc)

async def update_category(category_id: str, update_data: dict):
    if not ObjectId.is_valid(category_id):
        return None
    result = await db_instance.db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_data}
    )
    if result.modified_count == 1:
        doc = await db_instance.db.categories.find_one({"_id": ObjectId(category_id)})
        return serialize_doc(doc)
    return None

async def delete_category(category_id: str):
    if not ObjectId.is_valid(category_id):
        return False
    # Xoá danh mục
    result = await db_instance.db.categories.delete_one({"_id": ObjectId(category_id)})
    if result.deleted_count == 1:
        # Xoá toàn bộ câu hỏi thuộc danh mục này
        await db_instance.db.questions.delete_many({"category_id": ObjectId(category_id)})
        return True
    return False

# --- Exam Snapshots CRUD ---
async def create_exam_snapshots(snapshots_data: list[dict]):
    if not snapshots_data:
        return 0
    for s in snapshots_data:
        s["created_at"] = datetime.utcnow()
    result = await db_instance.db.exam_snapshots.insert_many(snapshots_data)
    return len(result.inserted_ids)

async def get_exam_snapshots(exam_id: str):
    cursor = db_instance.db.exam_snapshots.find({"exam_id": exam_id})
    snapshots = await cursor.to_list(length=1000)
    return [serialize_doc(s) for s in snapshots]
