"""Auth service — business logic for authentication."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_jwt_token, verify_password
from app.models.user import User
from app.modules.auth.schemas import LoginRequest, TokenResponse


class AuthService:
    """Handles staff authentication and token generation."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def authenticate_user(self, request: LoginRequest) -> TokenResponse:
        """Authenticate staff user and return JWT."""
        stmt = select(User).where(User.email == request.email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials or inactive user.",
            )

        if not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials.",
            )

        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "tenant_id": str(user.tenant_id),
        }
        
        access_token = create_jwt_token(token_data)

        return TokenResponse(
            access_token=access_token,
            user={
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role.value,
            }
        )
