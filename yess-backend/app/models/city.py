"""
City model for Kyrgyzstan cities
"""
from sqlalchemy import Column, Integer, String, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base


class City(Base):
    __tablename__ = "cities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    name_kg = Column(String(100))  # Кыргызча название
    region = Column(String(100))  # Область/регион
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    
    # Relationships
    users = relationship("User", back_populates="city")
    partners = relationship("Partner", back_populates="city")
    
    def __repr__(self):
        return f"<City {self.name}>"

