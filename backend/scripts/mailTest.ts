// scripts/mailTest.ts

import {
    sendWelcomeEmail,
    sendOrderConfirmation,
    sendOrderStatusUpdate,
    sendPasswordlessLoginEmail,
    sendVerificationEmailOTP,
} from "../src/config/email.js";

const TO = "dreamgf691@gmail.com";
const TO2 = TO ?? "technicaladityarathore@gmail.com";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const randomOrderId = () =>
    `rk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Discriminated union type for all supported email tasks
type EmailTask =
    | { type: "welcome"; to: string; name: string }
    | { type: "order"; to: string; name: string; amount: number; orderId?: string }
    | { type: "status"; to: string; name: string; status: string; tracking?: string; orderId?: string }
    | { type: "magic-link"; to: string; name: string; link: string; expiresInMinutes?: number }
    | { type: "otp"; to: string; name: string; otp: string }
    | { type: "custom"; label: string; fn: () => Promise<void> };

/**
 * Executes a batch of email tasks sequentially with a configurable delay between each email.
 */
async function processEmailBatch(tasks: EmailTask[], delayMs: number = 1000) {
    console.log(`\n============================================================`);
    console.log(`🚀 Starting Email Batch Process (${tasks.length} Email Tasks)`);
    console.log(`============================================================\n`);

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`[${i + 1}/${tasks.length}] Task: ${task.type.toUpperCase()}`);

        try {
            switch (task.type) {
                case "welcome":
                    console.log(`  └─ Welcome Email -> ${task.to} (${task.name})`);
                    await sendWelcomeEmail(task.to, task.name);
                    break;

                case "order": {
                    const orderId = task.orderId || randomOrderId();
                    console.log(`  └─ Order Confirmation -> ${task.to} (Order #${orderId.slice(-8).toUpperCase()}, Amount ₹${(task.amount / 100).toFixed(2)})`);
                    await sendOrderConfirmation(task.to, task.name, orderId, task.amount);
                    break;
                }

                case "status": {
                    const orderId = task.orderId || randomOrderId();
                    console.log(`  └─ Status Update (${task.status}) -> ${task.to}`);
                    await sendOrderStatusUpdate(task.to, task.name, orderId, task.status, task.tracking);
                    break;
                }

                case "magic-link":
                    console.log(`  └─ Magic Link -> ${task.to}`);
                    await sendPasswordlessLoginEmail(task.to, task.name, task.link, task.expiresInMinutes ?? 15);
                    break;

                case "otp":
                    console.log(`  └─ Verification OTP (${task.otp}) -> ${task.to}`);
                    await sendVerificationEmailOTP(task.to, task.name, task.otp);
                    break;

                case "custom":
                    console.log(`  └─ Custom Task: ${task.label}`);
                    await task.fn();
                    break;
            }
        } catch (err) {
            console.error(`❌ Error sending email task [${task.type}]:`, err);
        }

        if (i < tasks.length - 1 && delayMs > 0) {
            await sleep(delayMs);
        }
    }

    console.log(`\n============================================================`);
    console.log(`✔ All ${tasks.length} emails processed successfully.`);
    console.log(`============================================================\n`);
}

// Example usage array containing a list of email jobs
const emailBatchJobs: EmailTask[] = [
    // 1. Welcome Emails
    { type: "welcome", to: TO, name: "Nishan" },
    { type: "welcome", to: TO2, name: "Aditya" },
    { type: "welcome", to: TO, name: "Premium Customer" },

    // 2. Order Confirmation Emails
    { type: "order", to: TO2, name: "Aditya", amount: 9900 },
    { type: "order", to: TO, name: "Nishan Rajak", amount: 49900 },
    { type: "order", to: TO, name: "Nishan Rajak", amount: 249900 },

    // 3. Order Status Updates
    { type: "status", to: TO2, name: "Aditya", status: "PROCESSING" },
    { type: "status", to: TO2, name: "Aditya", status: "SHIPPED", tracking: "RK123456789IN" },
    { type: "status", to: TO2, name: "Aditya", status: "DELIVERED", tracking: "RK123456789IN" },
    { type: "status", to: TO2, name: "Aditya", status: "CANCELLED" },

    // 4. Magic Links
    {
        type: "magic-link",
        to: TO2,
        name: "Aditya",
        link: "https://ranchikart.vercel.app/auth/magic-link?token=abcdefghijklmnopqrstuvwxyz123456789",
        expiresInMinutes: 15,
    },

    // 5. Verification OTPs
    { type: "otp", to: TO2, name: "Aditya", otp: "483921" },
    { type: "otp", to: TO2, name: "Aditya", otp: "999999" },
];

// Run the batch email processor
processEmailBatch(emailBatchJobs, 1000).catch(console.error);