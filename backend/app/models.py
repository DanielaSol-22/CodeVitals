""""
Modelos ORM 

"""
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
 
from app.database import Base
 
 
class Repositorio(Base):
    __tablename__ = "repositorios"
 
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(255))
    ruta: Mapped[str] = mapped_column(String(1024))
    url_remota: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    fecha_analisis: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
 
    modulos: Mapped[list["Modulo"]] = relationship(back_populates="repositorio")
 
 
class Modulo(Base):
    __tablename__ = "modulos"
 
    id: Mapped[int] = mapped_column(primary_key=True)
    repositorio_id: Mapped[int] = mapped_column(ForeignKey("repositorios.id"))
    ruta_archivo: Mapped[str] = mapped_column(String(1024))
    lenguaje: Mapped[str | None] = mapped_column(String(50), nullable=True)
 
    repositorio: Mapped["Repositorio"] = relationship(back_populates="modulos")
    metricas: Mapped[list["Metrica"]] = relationship(back_populates="modulo")
    riesgos: Mapped[list["Riesgo"]] = relationship(back_populates="modulo")
 
 
class Metrica(Base):
    __tablename__ = "metricas"
 
    id: Mapped[int] = mapped_column(primary_key=True)
    modulo_id: Mapped[int] = mapped_column(ForeignKey("modulos.id"))
    complejidad_ciclomatica: Mapped[float] = mapped_column(Float, default=0.0)
    loc: Mapped[int] = mapped_column(Integer, default=0)
    codigo_duplicado_pct: Mapped[float] = mapped_column(Float, default=0.0)
    code_churn: Mapped[float] = mapped_column(Float, default=0.0)
    bus_factor: Mapped[int] = mapped_column(Integer, default=0)
    numero_commits: Mapped[int] = mapped_column(Integer, default=0)
    numero_funciones: Mapped[int] = mapped_column(Integer, default=0)
 
    modulo: Mapped["Modulo"] = relationship(back_populates="metricas")
 
 
class Riesgo(Base):
    __tablename__ = "riesgos"
 
    id: Mapped[int] = mapped_column(primary_key=True)
    modulo_id: Mapped[int] = mapped_column(ForeignKey("modulos.id"))
    puntaje: Mapped[float] = mapped_column(Float)
    clasificacion: Mapped[str] = mapped_column(String(10))  # LOW | MEDIUM | HIGH
    fecha_calculo: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
 
    modulo: Mapped["Modulo"] = relationship(back_populates="riesgos")
    recomendaciones: Mapped[list["Recomendacion"]] = relationship(back_populates="riesgo")
 
 
class Recomendacion(Base):
    __tablename__ = "recomendaciones"
 
    id: Mapped[int] = mapped_column(primary_key=True)
    riesgo_id: Mapped[int] = mapped_column(ForeignKey("riesgos.id"))
    texto: Mapped[str] = mapped_column(Text)
 
    riesgo: Mapped["Riesgo"] = relationship(back_populates="recomendaciones")
    