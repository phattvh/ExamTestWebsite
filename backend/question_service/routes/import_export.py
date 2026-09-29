from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
import pandas as pd
import io
import crud
from dependencies import require_permission
from datetime import datetime

router = APIRouter()

@router.post("/import", status_code=status.HTTP_201_CREATED)
async def import_questions(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_permission("question:create"))
):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
        
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Expected columns: text, type, options (JSON string), correct_answer, difficulty, subject, tags (comma separated)
        imported_count = 0
        for _, row in df.iterrows():
            question_data = {
                "content": {"text": str(row.get('text', ''))},
                "type": str(row.get('type', 'multiple_choice')),
                "options": [], # Simplify for PoC: require JSON string parsing for real app
                "correct_answer": str(row.get('correct_answer', '')),
                "metadata": {
                    "difficulty": str(row.get('difficulty', 'medium')),
                    "subject": str(row.get('subject', 'general')),
                    "tags": [t.strip() for t in str(row.get('tags', '')).split(',')] if pd.notna(row.get('tags')) else []
                },
                "created_by": current_user.get("id")
            }
            # Add options if provided as valid JSON string, otherwise empty list
            try:
                import json
                if pd.notna(row.get('options')):
                    question_data["options"] = json.loads(row.get('options'))
            except:
                pass
                
            await crud.create_question(question_data)
            imported_count += 1
            
        return {"message": f"Successfully imported {imported_count} questions"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.get("/export")
async def export_questions(
    current_user: dict = Depends(require_permission("question:read"))
):
    try:
        # Get all questions
        _, items = await crud.get_questions(skip=0, limit=10000)
        
        # "Làm phẳng" câu hỏi ra định dạng Excel dễ đọc/sửa tay và IMPORT LẠI ĐƯỢC:
        # mỗi đáp án 1 cột riêng (option_1..option_6), cột correct_answer ghi số thứ tự
        # đáp án đúng (1-based, cách nhau dấu phẩy nếu nhiều đáp án đúng) thay vì tuồn
        # nguyên cấu trúc JSON nội bộ (options[].id) ra — người dùng không tự sửa được.
        # Bản export trước đây thiếu hẳn cột đáp án nên xuất ra không dùng lại được.
        data = []
        for q in items:
            options = q.get("options", []) or []
            row = {
                "text": q.get("content", {}).get("text", ""),
                "type": q.get("type", "multiple_choice"),
                "subject": q.get("metadata", {}).get("subject", ""),
                "difficulty": q.get("metadata", {}).get("difficulty", "medium"),
                "tags": ",".join(q.get("metadata", {}).get("tags", [])),
            }
            for i in range(6):
                row[f"option_{i + 1}"] = options[i]["text"] if i < len(options) else ""

            if q.get("type") in ("multiple_choice", "multiple_select"):
                correct_indices = [str(i + 1) for i, o in enumerate(options) if o.get("is_correct")]
                row["correct_answer"] = ",".join(correct_indices)
            elif q.get("type") == "true_false":
                correct_opts = [o for o in options if o.get("is_correct")]
                correct_text = str(correct_opts[0].get("text", "")).strip().lower() if correct_opts else ""
                row["correct_answer"] = "true" if correct_text in ("đúng", "true", "dung") else "false"
            else:
                # matching/essay: cấu trúc quá phức tạp cho 1 dòng Excel phẳng — tạo/sửa qua giao diện.
                row["correct_answer"] = ""

            data.append(row)
            
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
            
        output.seek(0)
        
        headers = {
            'Content-Disposition': f'attachment; filename="questions_export_{datetime.now().strftime("%Y%m%d")}.xlsx"'
        }
        
        return StreamingResponse(
            output, 
            headers=headers, 
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting data: {str(e)}")
