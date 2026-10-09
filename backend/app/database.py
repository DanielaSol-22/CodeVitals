"""
Conexión a PostgreSQL mediante SQLAlchemy (async) + sesión por request.
Reemplaza el almacenamiento SQLite del prototipo inicial.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=settings.debug, future=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Crea las tablas si no existen (para desarrollo; en producción usar Alembic)."""
    # Importa los modelos para que se registren en Base.metadata ANTES de
    # create_all (si no, SQLAlchemy no sabe que existen y no crea las tablas).
    from app import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
