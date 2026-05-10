from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env", override=True)
SECRET_KEY = config("SECRET_KEY", default="unsafe-secret-key")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = [host for host in config("ALLOWED_HOSTS", default="").split(",") if host]

INSTALLED_APPS = [
    "jazzmin",
    "daphne",
    "channels",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "apps.users",
    "apps.organizers",
    "apps.services",
    "apps.bookings",
    "apps.packages",
    "apps.reviews",
    "apps.notifications",
    "apps.payments",
    "apps.chat",
    "apps.ai_assistant",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Set USE_SQLITE=true in .env when PostgreSQL (DB_HOST) is unreachable — e.g. laptop off-LAN.
USE_SQLITE = config("USE_SQLITE", default=False, cast=bool)
if USE_SQLITE:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    _db_connect_timeout = config("DB_CONNECT_TIMEOUT", default=10, cast=int)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("DB_NAME", default="book_my_event"),
            "USER": config("DB_USER", default="postgres"),
            "PASSWORD": config("DB_PASSWORD", default="postgres"),
            "HOST": config("DB_HOST", default="localhost"),
            "PORT": config("DB_PORT", default="5432"),
            **(
                {"OPTIONS": {"connect_timeout": _db_connect_timeout}}
                if _db_connect_timeout > 0
                else {}
            ),
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Karachi"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "common.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="no-reply@bookmyevent.com")
ADMIN_NOTIFY_EMAIL = config("ADMIN_NOTIFY_EMAIL", default="admin@bookmyevent.com")

# If False, new accounts are marked verified immediately (no verification email). Prefer True with SMTP configured.
REQUIRE_EMAIL_VERIFICATION = config("REQUIRE_EMAIL_VERIFICATION", default=True, cast=bool)

SITE_URL = config("SITE_URL", default="http://localhost:8000")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

# Browser origins allowed to call the API (comma-separated). Override with CORS_ALLOWED_ORIGINS in production.
if DEBUG:
    _cors_default = (
        f"{FRONTEND_URL},http://localhost:3000,http://localhost:3001,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001"
    )
else:
    _cors_default = FRONTEND_URL

CORS_ALLOWED_ORIGINS = list(
    dict.fromkeys(
        origin.strip()
        for origin in config("CORS_ALLOWED_ORIGINS", default=_cors_default).split(",")
        if origin.strip()
    )
)
# In development, allow any localhost / 127.0.0.1 port (e.g. 3002 if Next picks another).
if DEBUG:
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^https?://localhost(:\d+)?$",
        r"^https?://127\.0\.0\.1(:\d+)?$",
    ]

CORS_ALLOW_CREDENTIALS = True

_redis_url = config("REDIS_URL", default="")
if _redis_url:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [_redis_url]},
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }

PASSWORD_RESET_TIMEOUT = 60 * 30

# django-jazzmin — https://django-jazzmin.readthedocs.io/
JAZZMIN_SETTINGS = {
    "site_title": "Book My Event Admin",
    "site_header": "Book My Event",
    "site_brand": "Book My Event",
    "welcome_sign": "Sign in to manage organizers, bookings, and catalog data.",
    "copyright": "Book My Event",
    "show_ui_builder": False,
    "search_model": ["users.User", "organizers.OrganizerProfile", "services.Service"],
    "icons": {
        "auth": "fas fa-shield-alt",
        "auth.group": "fas fa-users",
        "users.user": "fas fa-user",
        "users.emailverificationtoken": "fas fa-envelope-open-text",
        "users.passwordresettoken": "fas fa-key",
        "organizers.organizerprofile": "fas fa-store",
        "organizers.organizereventphoto": "fas fa-images",
        "services.servicecategory": "fas fa-tags",
        "services.service": "fas fa-concierge-bell",
        "bookings.booking": "fas fa-calendar-check",
        "packages.eventpackage": "fas fa-box-open",
        "packages.packageitem": "fas fa-list-ul",
        "reviews.review": "fas fa-star",
        "notifications.notification": "fas fa-bell",
        "payments.payment": "fas fa-credit-card",
        "chat.message": "fas fa-comments",
        "ai_assistant.assistantlog": "fas fa-robot",
    },
    "order_with_respect_to": [
        "users",
        "organizers",
        "services",
        "bookings",
        "packages",
        "reviews",
        "notifications",
        "payments",
        "chat",
        "ai_assistant",
        "auth",
    ],
    "related_modal_active": True,
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {
        "users.user": "collapsible",
        "organizers.organizerprofile": "horizontal_tabs",
        "services.service": "horizontal_tabs",
    },
}

JAZZMIN_UI_TWEAKS = {
    "theme": "darkly",
    "dark_mode_theme": None,
    "navbar_fixed": True,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-primary",
    "navbar": "navbar-dark",
    "accent": "accent-primary",
    "body_small_text": False,
    "sidebar_nav_child_indent": True,
}
