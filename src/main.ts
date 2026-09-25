import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads/",
  });
  app.setGlobalPrefix("api/v1");
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3001")
    .split(",")
    .map((origin) => origin.trim());
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Food Ordering API")
    .setDescription("API de gestion des précommandes et livraisons")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    "docs",
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
