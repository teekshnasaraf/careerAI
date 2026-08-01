import { Request, Response } from "express";
import UserSettings from "../models/UserSettings";
import User from "../models/User";

export const getUserSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userDoc = await User.findById(req.userId);
    let settings = await UserSettings.findOne({ user: req.userId });

    if (!settings) {
      settings = await UserSettings.create({
        user: req.userId,
        profile: {
          name: userDoc?.fullName || "CareerAI User",
          phone: "",
          college: "University Institute of Technology",
          degree: "Bachelor of Technology",
          branch: "Computer Science & Engineering",
          graduationYear: "2025",
          cgpa: "8.5 / 10",
          location: "San Francisco, CA",
          linkedin: "https://linkedin.com/in/careerai-user",
          github: "https://github.com/careerai-user",
          portfolio: "https://careerai.dev",
          bio: "Passionate software engineering candidate building full stack applications.",
          avatarUrl: "",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching settings",
    });
  }
};

export const updateUserSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { profile, career, learning, aiPreferences, notifications } = req.body;

    const updatedSettings = await UserSettings.findOneAndUpdate(
      { user: req.userId },
      {
        profile,
        career,
        learning,
        aiPreferences,
        notifications,
      },
      { upsert: true, new: true }
    );

    if (profile?.name) {
      await User.findByIdAndUpdate(req.userId, { fullName: profile.name });
    }

    res.status(200).json({
      success: true,
      message: "Settings saved successfully",
      data: updatedSettings,
    });
  } catch (error) {
    console.error("Error updating user settings:", error);
    res.status(500).json({
      success: false,
      message: "Server error saving settings",
    });
  }
};
