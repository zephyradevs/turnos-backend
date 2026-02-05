import { Router } from "express";
import authRoutes from "./auth.routes";
import businessRoutes from "./business.routes";
import appointmentRoutes from "./appointment.routes";
import dashboardRoutes from "./dashboard.routes";

const router = Router();

// API routes
router.use("/auth", authRoutes);
router.use("/business", businessRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/dashboard", dashboardRoutes);

// Health check
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
