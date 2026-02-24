import { Router } from 'express';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_FILE = join(__dirname, '..', 'data', 'reports', 'reports.json');

const router = Router();

// POST /api/reports — Submit abuse report
router.post('/', (req, res) => {
    try {
        const { reason, description, reporterSession, reportedPartner, chatDuration } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Reason is required' });
        }

        const report = {
            id: uuidv4(),
            reason,
            description: description || '',
            reporterSession: reporterSession || 'anonymous',
            reportedPartner: reportedPartner || 'unknown',
            chatDuration: chatDuration || 0,
            createdAt: Date.now(),
            status: 'pending',
        };

        let reports = [];
        if (existsSync(REPORTS_FILE)) {
            reports = JSON.parse(readFileSync(REPORTS_FILE, 'utf-8'));
        }
        reports.push(report);
        writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));

        res.status(201).json({ success: true, reportId: report.id });
    } catch (err) {
        console.error('[REPORT] Error:', err);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

export default router;
