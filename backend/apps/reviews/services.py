from .models import Review


def hide_review(review: Review) -> Review:
    review.is_visible = False
    review.save(update_fields=["is_visible"])
    return review
