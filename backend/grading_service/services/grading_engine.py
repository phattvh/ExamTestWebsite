import json
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def _safe_json_parse(value):
    """Đáp án của học sinh cho câu chọn-nhiều-đáp-án / nối cột được frontend gửi dạng
    chuỗi JSON (vì cột lưu trong Postgres chỉ là kiểu Text). Nếu không parse được
    (VD: câu chọn 1 đáp án gửi thẳng string id), trả nguyên giá trị gốc."""
    if value is None:
        return None
    if isinstance(value, (list, dict)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


class GradingEngine:
    def __init__(self, questions: List[Dict[str, Any]]):
        self.questions = questions
        self.question_map = {q.get("_id") or q.get("id"): q for q in questions}

    def grade(self, answers: Dict[str, str]) -> dict:
        """
        answers: { "question_id": "<chuỗi đáp án đã lưu>" }
        Với multiple_choice/true_false: chuỗi là option id được chọn.
        Với multiple_select: chuỗi JSON list các option id, VD '["opt1","opt3"]'.
        Với matching: chuỗi JSON list các cặp [left_id, right_id], VD '[["L1","R2"]]'.
        Với essay: chuỗi văn bản tự luận, hoặc URL ảnh chụp bài làm tay — luôn cần chấm tay.
        """
        correct_count = 0
        question_results = []

        for idx, question in enumerate(self.questions):
            question_id = question.get("_id") or question.get("id")
            user_answer_raw = answers.get(str(question_id))
            if user_answer_raw is None:
                user_answer_raw = answers.get(str(idx))

            q_type = question.get("type", "multiple_choice")
            point_possible = question.get("point_possible", 1.0)
            options = question.get("options") or []

            is_correct = False
            point_earned = 0.0
            needs_manual_grading = False

            if q_type in ("multiple_choice", "true_false"):
                correct_ids = [str(opt.get("id")) for opt in options if opt.get("is_correct")]
                correct_answer = correct_ids[0] if correct_ids else None
                is_correct = user_answer_raw is not None and str(user_answer_raw) == str(correct_answer)
                point_earned = point_possible if is_correct else 0.0

            elif q_type == "multiple_select":
                correct_ids = set(str(opt.get("id")) for opt in options if opt.get("is_correct"))
                submitted = _safe_json_parse(user_answer_raw)
                submitted_ids = set(str(x) for x in submitted) if isinstance(submitted, list) else set()
                # Chấm kiểu tất-cả-hoặc-không: đúng khi chọn đủ và không thừa đáp án nào.
                is_correct = bool(correct_ids) and submitted_ids == correct_ids
                point_earned = point_possible if is_correct else 0.0

            elif q_type == "matching":
                correct_pairs_raw = question.get("correct_answer")
                correct_pairs = _safe_json_parse(correct_pairs_raw)
                submitted_pairs = _safe_json_parse(user_answer_raw)

                def normalize(pairs, dedupe_left=False):
                    if not isinstance(pairs, list):
                        return set()
                    out = set()
                    seen_left = set()
                    for p in pairs:
                        if isinstance(p, (list, tuple)) and len(p) == 2:
                            left, right = str(p[0]), str(p[1])
                        elif isinstance(p, str) and ":" in p:
                            left, right = p.split(":", 1)
                        else:
                            continue
                        # Chặn gian lận: nếu 1 vế trái xuất hiện nhiều lần (VD học sinh
                        # gọi thẳng API submit hết mọi tổ hợp có thể thay vì nối qua giao
                        # diện thật — giao diện dropdown chỉ cho chọn 1 vế phải/vế trái),
                        # chỉ tính CẶP ĐẦU TIÊN của vế trái đó, bỏ qua các cặp trùng sau.
                        if dedupe_left:
                            if left in seen_left:
                                continue
                            seen_left.add(left)
                        out.add((left, right))
                    return out

                correct_set = normalize(correct_pairs)
                submitted_set = normalize(submitted_pairs, dedupe_left=True)

                if correct_set:
                    # Chấm điểm bán phần: điểm theo tỉ lệ số cặp nối đúng trên tổng số cặp.
                    matched = len(correct_set & submitted_set)
                    ratio = matched / len(correct_set)
                    point_earned = round(point_possible * ratio, 4)
                    is_correct = matched == len(correct_set) and len(submitted_set) == len(correct_set)
                else:
                    point_earned = 0.0
                    is_correct = False

            else:
                # essay (tự luận viết tay/chụp ảnh hoặc gõ text): không thể chấm tự động,
                # cần giáo viên chấm tay qua endpoint POST /grading/manual-grade sau đó.
                point_earned = 0.0
                is_correct = False
                needs_manual_grading = True

            if is_correct:
                correct_count += 1

            question_results.append({
                "question_id": str(question_id),
                "user_answer": user_answer_raw,
                "is_correct": is_correct,
                "point_earned": point_earned,
                "point_possible": point_possible,
                "needs_manual_grading": needs_manual_grading,
            })

        total_earned = sum(qr["point_earned"] for qr in question_results)
        total_possible = sum(qr["point_possible"] for qr in question_results)
        percentage = (total_earned / total_possible * 100) if total_possible > 0 else 0
        pending_count = sum(1 for qr in question_results if qr["needs_manual_grading"])
        incorrect_count = max(0, len(question_results) - correct_count - pending_count)

        return {
            "score": total_earned,
            "total_possible": total_possible,
            "percentage": percentage,
            "correct_count": correct_count,
            "pending_count": pending_count,
            "incorrect_count": incorrect_count,
            "question_results": question_results,
            "has_pending_manual_grading": pending_count > 0,
        }
