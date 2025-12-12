"""Background tasks for stories"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.story_service import StoryService
import logging

logger = logging.getLogger(__name__)


def cleanup_expired_stories():
    """Cleanup expired stories - call this from cron or scheduler"""
    db: Session = SessionLocal()
    try:
        count = StoryService.cleanup_expired_stories(db)
        logger.info(f"Cleaned up {count} expired stories")
        return count
    except Exception as e:
        logger.error(f"Error cleaning up expired stories: {str(e)}")
        return 0
    finally:
        db.close()


def activate_scheduled_stories():
    """Activate scheduled stories - call this from cron or scheduler"""
    db: Session = SessionLocal()
    try:
        count = StoryService.activate_scheduled_stories(db)
        logger.info(f"Activated {count} scheduled stories")
        return count
    except Exception as e:
        logger.error(f"Error activating scheduled stories: {str(e)}")
        return 0
    finally:
        db.close()

