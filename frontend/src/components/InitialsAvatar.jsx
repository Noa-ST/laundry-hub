import React, { useState, useEffect } from 'react';

/**
 * Lấy chữ cái đầu đại diện theo chuẩn tên tiếng Việt:
 * tên gọi nằm ở cuối, nên ưu tiên 2 từ cuối cùng.
 *  - "Nguyễn Tuấn Kiệt" -> "TK"
 *  - "Tuấn Kiệt"        -> "TK"
 *  - "Admin"            -> "A"
 */
export const getInitials = (fullName = '') => {
    const words = String(fullName)
        .trim()
        .split(/\s+/)
        .filter(w => /^[\p{L}\p{N}]/u.test(w));

    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].charAt(0).toLocaleUpperCase('vi');

    const lastTwo = words.slice(-2);
    return lastTwo.map(w => w.charAt(0).toLocaleUpperCase('vi')).join('');
};

// Các dịch vụ sinh avatar tự động (dicebear, ui-avatars...) cho ra hình hoạt họa
// với biểu cảm ngẫu nhiên (có thể buồn/khóc) -> coi như "chưa có ảnh" và dùng chữ cái đầu.
const GENERATED_AVATAR_HOSTS = ['dicebear.com', 'ui-avatars.com', 'robohash.org', 'avatars.dicebear'];

const isRealPhoto = (url) => {
    if (!url || typeof url !== 'string') return false;
    return !GENERATED_AVATAR_HOSTS.some(host => url.includes(host));
};

const SIZE_CLASSES = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
};

/**
 * Avatar chuẩn SaaS: hiển thị ảnh thật nếu người dùng đã tải lên,
 * ngược lại hiển thị chữ cái đầu trên nền tròn trung tính.
 */
const InitialsAvatar = ({ name, src, size = 'md', className = '' }) => {
    const [imgFailed, setImgFailed] = useState(false);
    useEffect(() => { setImgFailed(false); }, [src]);
    const showImage = isRealPhoto(src) && !imgFailed;
    const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

    if (showImage) {
        return (
            <img
                src={src}
                alt={name || 'Ảnh đại diện'}
                onError={() => setImgFailed(true)}
                className={`${sizeClass} rounded-full object-cover shrink-0 ${className}`}
            />
        );
    }

    return (
        <div
            role="img"
            aria-label={name || 'Ảnh đại diện'}
            title={name}
            className={`${sizeClass} rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 select-none tracking-wide ${className}`}
        >
            {getInitials(name)}
        </div>
    );
};

export default InitialsAvatar;
