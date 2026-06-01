"use client";

import { HandsReminderIllustration } from "./HandsReminderIllustration";
import styles from "./HandsReminderCard.module.css";

type HandsReminderCardProps = {
  onContinue: () => void;
};

export function HandsReminderCard({ onContinue }: HandsReminderCardProps) {
  return (
    <div className={styles.card}>
      <HandsReminderIllustration />
      <p className={styles.eyebrow}>Before you begin</p>
      <h2 className={styles.title} id="hands-reminder-title">
        Your hands are the key
      </h2>
      <p className={styles.body}>
        Hold both palms toward the camera and keep them in view. Every threshold ahead
        reads your fingers.
      </p>
      <button type="button" className={styles.cta} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
