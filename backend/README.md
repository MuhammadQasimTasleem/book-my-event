# Book My Event - Backend

Production-style Django REST Framework backend using a modular monolith architecture.

## Setup

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Create a PostgreSQL database and update `.env`.

## Migrations

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

## Run (Development)

```bash
python manage.py runserver
```

## Settings Modules

- `config.settings.dev`
- `config.settings.prod`

## Notes

- Email is configured for Gmail SMTP. Use an App Password.
- Update `SITE_URL` and `FRONTEND_URL` in `.env`.
