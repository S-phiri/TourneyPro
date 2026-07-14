from datetime import timedelta
from pathlib import Path
from urllib.parse import unquote, urlparse
import os

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


def _parse_csv_env(name: str, default: str = '') -> list[str]:
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(',') if item.strip()]


def get_database_config() -> dict:
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        parsed = urlparse(database_url)
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': parsed.path.lstrip('/'),
            'USER': unquote(parsed.username or ''),
            'PASSWORD': unquote(parsed.password or ''),
            'HOST': parsed.hostname or '',
            'PORT': str(parsed.port or 5432),
            'OPTIONS': {'sslmode': 'require'},
        }

    db_name = os.environ.get('DB_NAME')
    if db_name:
        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': db_name,
            'USER': os.environ.get('DB_USER', ''),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }

    return {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }


SECRET_KEY = os.environ.get('SECRET_KEY', '-p_f_4&3aqvz57mu@#c%grvpii^7vndag)vo30*#&%qgp7hy-2')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

if DEBUG:
    ALLOWED_HOSTS = _parse_csv_env('ALLOWED_HOSTS', 'localhost,127.0.0.1')
else:
    ALLOWED_HOSTS = _parse_csv_env('ALLOWED_HOSTS')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'accounts',
    'tournaments',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

DATABASES = {
    'default': get_database_config(),
}

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CSRF_TRUSTED_ORIGINS = _parse_csv_env(
        'CSRF_TRUSTED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173',
    )
else:
    CORS_ALLOW_ALL_ORIGINS = False
    cors_origins = _parse_csv_env('CORS_ALLOWED_ORIGINS')
    if not cors_origins:
        cors_origins = _parse_csv_env('FRONTEND_URL')
    CORS_ALLOWED_ORIGINS = cors_origins
    CSRF_TRUSTED_ORIGINS = _parse_csv_env('CSRF_TRUSTED_ORIGINS') or cors_origins

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-language',
    'content-type',
    'authorization',
    'x-csrftoken',
]
CORS_EXPOSE_HEADERS = ['content-type']

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@tournament.com')

if DEBUG and not os.environ.get('EMAIL_HOST_USER'):
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

if not DEBUG:
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'tournaments': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}
