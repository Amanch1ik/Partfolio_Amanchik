"""Schemas for Stories"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.story import StoryType, StoryActionType, StoryStatus


class StoryBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    title_kg: Optional[str] = Field(None, max_length=255)
    title_ru: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    description_kg: Optional[str] = None
    description_ru: Optional[str] = None
    image_url: str = Field(..., min_length=1)
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    story_type: str = Field(default=StoryType.ANNOUNCEMENT.value)
    partner_id: Optional[int] = None
    promotion_id: Optional[int] = None
    city_id: Optional[int] = None
    expires_at: datetime
    scheduled_at: Optional[datetime] = None
    priority: int = Field(default=0, ge=0)
    target_audience: str = Field(default="all")
    action_type: str = Field(default=StoryActionType.NONE.value)
    action_value: Optional[str] = None
    auto_delete: bool = Field(default=True)
    show_timer: bool = Field(default=True)


class StoryCreate(StoryBase):
    pass


class StoryUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    title_kg: Optional[str] = Field(None, max_length=255)
    title_ru: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    description_kg: Optional[str] = None
    description_ru: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    story_type: Optional[str] = None
    partner_id: Optional[int] = None
    promotion_id: Optional[int] = None
    city_id: Optional[int] = None
    expires_at: Optional[datetime] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0)
    target_audience: Optional[str] = None
    action_type: Optional[str] = None
    action_value: Optional[str] = None
    auto_delete: Optional[bool] = None
    show_timer: Optional[bool] = None


class StoryResponse(StoryBase):
    id: int
    status: str
    is_active: bool
    views_count: int
    clicks_count: int
    shares_count: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int] = None
    
    # Связанные объекты
    partner_name: Optional[str] = None
    promotion_title: Optional[str] = None
    city_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class StoryListResponse(BaseModel):
    items: List[StoryResponse]
    total: int
    page: int
    page_size: int


class StoryViewRequest(BaseModel):
    story_id: int


class StoryClickRequest(BaseModel):
    story_id: int
    action_type: Optional[str] = None


class StoryStatsResponse(BaseModel):
    story_id: int
    views_count: int
    clicks_count: int
    shares_count: int
    unique_views: int
    click_rate: float  # Процент кликов от просмотров
    recent_views: List[dict]  # Последние просмотры
    recent_clicks: List[dict]  # Последние клики

