import logging
import os
import threading
import time
from typing import Any, List, Optional

from fastapi import HTTPException, Request
from firebase_admin import auth

from app.core.firebase import get_db

logger = logging.getLogger(__name__)
AUTH_DEBUG_LOGS = os.getenv("AUTH_DEBUG", "false").lower() in {"1", "true", "yes"}
USER_FALLBACK_CACHE_TTL_SECONDS = int(os.getenv("AUTH_FALLBACK_CACHE_TTL", "300"))

_fallback_claim_cache = {}
_cache_lock = threading.Lock()


def _read_cached_fallback(uid: str):
    now = time.monotonic()
    with _cache_lock:
        cached = _fallback_claim_cache.get(uid)
        if not cached:
            return None
        if cached["expires_at"] <= now:
            _fallback_claim_cache.pop(uid, None)
            return None
        return cached


def _write_cached_fallback(
    uid: str,
    company_id: Optional[str],
    role: str,
    allowed_tabs: Optional[List[str]],
    full_name: Optional[str],
    phone: Optional[str],
):
    if not uid or not company_id:
        return
    expires_at = time.monotonic() + USER_FALLBACK_CACHE_TTL_SECONDS
    with _cache_lock:
        _fallback_claim_cache[uid] = {
            "company_id": company_id,
            "role": role,
            "allowed_tabs": allowed_tabs or [],
            "full_name": full_name,
            "phone": phone,
            "expires_at": expires_at,
        }


async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="MISSING_HEADER: No Bearer token in Authorization header",
        )

    id_token = auth_header.split(" ", 1)[1]
    if len(id_token) < 100:
        raise HTTPException(
            status_code=401,
            detail=f"INVALID_TOKEN: Token too short ({len(id_token)} chars)",
        )

    try:
        decoded_token = auth.verify_id_token(id_token, check_revoked=False)
        uid = decoded_token.get("uid") or decoded_token.get("sub")

        role = decoded_token.get("role", "viewer")
        company_id = decoded_token.get("company_id")
        allowed_tabs = decoded_token.get("allowed_tabs")
        full_name = decoded_token.get("full_name")
        phone = decoded_token.get("phone")

        needs_profile_fallback = uid and (
            not company_id or allowed_tabs is None or full_name is None or phone is None
        )

        bypass_cache_for_profile = request.url.path.endswith("/me")

        if needs_profile_fallback:
            cached = None if bypass_cache_for_profile else _read_cached_fallback(uid)
            if cached:
                company_id = cached["company_id"]
                role = cached["role"] or role
                allowed_tabs = cached.get("allowed_tabs", allowed_tabs or [])
                full_name = cached.get("full_name", full_name)
                phone = cached.get("phone", phone)
            else:
                db: Any = get_db()
                if db is not None:
                    user_doc: Any = db.collection("users").document(uid).get()
                    if hasattr(user_doc, "__await__"):
                        user_doc = await user_doc
                    if user_doc.exists:
                        user_data = user_doc.to_dict() or {}
                        company_id = user_data.get("company_id") or company_id
                        role = user_data.get("role") or role
                        allowed_tabs = (
                            user_data.get("allowed_tabs") or allowed_tabs or []
                        )
                        full_name = user_data.get("full_name") or full_name
                        phone = user_data.get("phone") or phone
                        _write_cached_fallback(
                            uid,
                            company_id,
                            role,
                            allowed_tabs,
                            full_name,
                            phone,
                        )

        decoded_token.update(
            {
                "role": role,
                "company_id": company_id,
                "allowed_tabs": allowed_tabs or [],
                "full_name": full_name,
                "phone": phone,
            }
        )

        if AUTH_DEBUG_LOGS:
            logger.info(
                "Auth verified | path=%s uid=%s company_id=%s",
                request.url.path,
                uid,
                bool(company_id),
            )

        return decoded_token
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="TOKEN_EXPIRED: Firebase token has expired. Please re-login.",
        )
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=401,
            detail="TOKEN_REVOKED: Token has been revoked",
        )
    except auth.InvalidIdTokenError as exc:
        raise HTTPException(status_code=401, detail=f"TOKEN_INVALID: {exc}")
    except Exception as exc:
        if AUTH_DEBUG_LOGS:
            logger.exception("Auth error on %s", request.url.path)
        raise HTTPException(
            status_code=401,
            detail=f"AUTH_ERROR: {type(exc).__name__}: {exc}",
        )
