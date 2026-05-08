from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from common.validators import (
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
        first_name = name.split(" ")[0] if name else ""
        user = User.objects.create_user(
            first_name=first_name,
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
