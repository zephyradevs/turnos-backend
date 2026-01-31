import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import prisma from "../../config/database";
import { config } from "../../config/env";
import redisClient from "../../config/redis";
import {
  checkBusinessSetupStatus,
  SetupStatus,
} from "../business/check-business-setup-status.service";
import { getUserByEmail } from "../user/get-user-by-email.service";

interface LoginResponse {
  user: Omit<User, "passwordHash">;
  token: string;
  setupStatus: SetupStatus;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  // Verificar si el usuario existe
  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error("Credenciales inválidas");
  }

  // Verificar si el email está verificado
  if (!user.emailVerified) {
    throw new Error(
      "Por favor verifica tu correo electrónico antes de iniciar sesión",
    );
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Credenciales inválidas");
  }

  // Generar token JWT
  const jwtOptions: SignOptions = {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions["expiresIn"],
  };

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    config.jwt.secret,
    jwtOptions,
  );

  // Guardar sesión en Redis (con expiración de 7 días)
  const sessionKey = `session:${user.id}`;
  const sessionData = JSON.stringify({
    userId: user.id,
    email: user.email,
    token,
    loginTime: new Date().toISOString(),
  });

  // Guardar en Redis con expiración de 7 días (604800 segundos)
  await redisClient.setEx(sessionKey, 604800, sessionData);

  // Actualizar lastLogin en la base de datos
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Remover passwordHash del objeto de respuesta
  const { passwordHash, ...userWithoutPassword } = user;

  // Verificar el estado de configuración del negocio
  const setupStatus = await checkBusinessSetupStatus(user.id);

  return {
    user: userWithoutPassword,
    token,
    setupStatus,
  };
}
