import fs from 'fs';
import path from 'path';

const searchDir = './src';

function processFile(filePath) {
    if (!filePath.endsWith('.jsx')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('alert(')) return;

    // determine if we need to import toast
    if (!content.includes("import { toast } from 'react-hot-toast'") && !content.includes('import toast from "react-hot-toast"') && !content.includes("import toast from 'react-hot-toast'")) {
        const importMatch = content.match(/import .* from '.*';\n/g);
        if (importMatch) {
            const lastImport = importMatch[importMatch.length - 1];
            content = content.replace(lastImport, lastImport + "import toast from 'react-hot-toast';\n");
        } else {
            content = "import toast from 'react-hot-toast';\n" + content;
        }
    }

    // Replace alerts based on heuristics
    content = content.replace(/alert\((.*?(?:thành công|thanh cong|Đã lưu|Đã đổi).*?)\)/gi, 'toast.success($1)');
    content = content.replace(/alert\((.*?(?:Lỗi|Vui lòng|Không thể|đã xảy ra|chưa đăng ký|không hợp lệ|Thất bại|Bạn cần|chưa đủ).*?)\)/gi, 'toast.error($1)');
    content = content.replace(/alert\((.*?)\)/g, 'toast($1)'); // Fallback

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Processed:', filePath);
}

function traverse(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverse(fullPath);
        } else {
            processFile(fullPath);
        }
    }
}

traverse(searchDir);
console.log('Done!');
