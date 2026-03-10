import fs from 'fs';
import path from 'path';
import { Request } from 'express';

export const processFile = (data: string | undefined | null, req: Request, subfolder: string = 'misc'): string | undefined | null => {
    if (!data || typeof data !== 'string' || !data.startsWith('data:')) {
        return data; // Return original if not base64 or invalid
    }

    try {
        // Extract extension and data
        const matches = data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
        const mime = matches ? matches[1] : 'application/octet-stream';
        const base64Data = data.replace(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/, "");

        // Map mime to extension
        let ext = 'bin';
        if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        else if (mime.includes('png')) ext = 'png';
        else if (mime.includes('pdf')) ext = 'pdf';
        else if (mime.includes('gif')) ext = 'gif';
        else if (mime.includes('svg')) ext = 'svg';
        else if (mime.includes('text/plain')) ext = 'txt';
        // Video
        else if (mime.includes('mp4')) ext = 'mp4';
        else if (mime.includes('webm')) ext = 'webm';
        else if (mime.includes('quicktime')) ext = 'mov';
        else if (mime.includes('x-msvideo') || mime.includes('avi')) ext = 'avi';
        else if (mime.includes('mpeg')) ext = 'mpeg';
        // Audio
        else if (mime.includes('audio/mpeg') || mime.includes('mp3')) ext = 'mp3';
        else if (mime.includes('wav')) ext = 'wav';
        else if (mime.includes('ogg')) ext = 'ogg';
        // Documents
        else if (mime.includes('wordprocessingml')) ext = 'docx';
        else if (mime.includes('msword')) ext = 'doc';
        else if (mime.includes('spreadsheetml')) ext = 'xlsx';
        else if (mime.includes('ms-excel')) ext = 'xls';
        // Archives
        else if (mime.includes('zip')) ext = 'zip';

        // Ensure directory
        const uploadsDir = path.join(process.cwd(), 'uploads', subfolder);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filename = `${subfolder}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, base64Data, 'base64');

        const protocol = req.protocol;
        const host = req.get('host');
        // Handle undefined host
        const baseUrl = host ? `${protocol}://${host}` : '';

        return `${baseUrl}/uploads/${subfolder}/${filename}`;
    } catch (e) {
        console.error(`Failed to save file in ${subfolder}:`, e);
        return data; // Fallback
    }
};

export const processFiles = (files: any[], req: Request, subfolder: string = 'misc'): string[] => {
    if (!files || !Array.isArray(files)) return [];
    return files.map(f => {
        const res = processFile(f, req, subfolder);
        return res || f;
    });
};
