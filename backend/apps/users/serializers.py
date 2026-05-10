from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from common.validators import (
    PK_PHONE_REGEX,
    validate_email_unique,
    validate_password_strength,
    validate_phone_pk,
    validate_username,
)
from .models import EmailVerificationToken, PasswordResetToken

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.CLIENT)

    class Meta:
        model = User
        fields = ("name", "username", "email", "password", "phone_number", "role")

    def validate_email(self, value):
        validate_email_unique(value)
        return value

    def validate_username(self, value):
        validate_username(value)
        return value

    def validate_phone_number(self, value):
        validate_phone_pk(value)
        return value

    def validate_password(self, value):
        validate_password_strength(value)
        return value

    def validate_role(self, value):
        if value not in [User.Role.CLIENT, User.Role.ORGANIZER]:
            raise serializers.ValidationError("Invalid role for registration.")
        return value

    def create(self, validated_data):
        name = validated_data.pop("name", "")
        parts = name.split(None, 1)
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""
        user = User.objects.create_user(
            first_name=first_name,
            last_name=last_name,
            **validated_data,
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "is_verified",
        )
        read_only_fields = ("email", "role", "is_verified")

    def validate_phone_number(self, value):
        """Allow blank; treat UI placeholder (+92…) as blank; enforce PK format when non-empty."""
        v = (value or "").strip()
        if not v:
            return ""
        if "\u2026" in v or "…" in v or v.endswith("..."):
            return ""
        if v in ("+92", "92", "0"):
            return ""
        if not PK_PHONE_REGEX.match(v):
            raise serializers.ValidationError(
                "Use a Pakistani mobile like +923001234567 or 03001234567, or leave blank."
            )
        return v


class EmailVerificationSerializer(serializers.Serializer):
    token = serializers.CharField()

    def validate_token(self, value):
        if not EmailVerificationToken.objects.filter(token=value).exists():
            raise serializers.ValidationError("Invalid token.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField()

    def validate_new_password(self, value):
        validate_password_strength(value)
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "is_verified",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class AdminUserActiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("is_active",)


class AdminUserManageSerializer(serializers.ModelSerializer):
    """Admin PATCH: account flags, role, and profile fields (not email/username here)."""

    class Meta:
        model = User
        fields = (
            "is_active",
            "is_verified",
            "role",
            "first_name",
            "last_name",
            "phone_number",
        )

    def validate_role(self, value):
        valid = {c[0] for c in User.Role.choices}
        if value not in valid:
            raise serializers.ValidationError("Invalid role.")
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_verified:
            raise serializers.ValidationError("Email is not verified.")
        if not self.user.is_active:
            raise serializers.ValidationError("User account is inactive.")
        data["role"] = self.user.role
        data["email"] = self.user.email
        return data
