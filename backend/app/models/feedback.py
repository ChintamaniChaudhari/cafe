import uuid
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field as SQLField

class Feedback(SQLModel, table=True):
    __tablename__ = "feedback"

    id: uuid.UUID = SQLField(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: str = SQLField(index=True)
    session_id: uuid.UUID = SQLField(index=True)
    rating: int = SQLField(ge=1, le=5)
    comment: str | None = SQLField(default=None)
    created_at: datetime = SQLField(default_factory=lambda: datetime.now(timezone.utc))
