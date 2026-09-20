import { Request, Response } from "express";
import UserSettings from "../models/UserSettings";
import User from "../models/User";

export const getUserSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // User lookup is no longer needed for seeding — profile starts blank.
    let settings = await UserSettings.findOne({ user: req.userId });

    if (!settings) {
      // Create a fully empty settings document. All field defaults are defined
      // in the schema (empty strings / neutral values). Do NOT pre-populate
      // with personal data, example values, or data from other documents.
      settings = await UserSettings.create({ user: req.userId });
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
