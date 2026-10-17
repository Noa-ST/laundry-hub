/**
 * Nguồn dữ liệu duy nhất để hiển thị trạng thái đơn hàng cho người dùng.
 * Không bao giờ render trực tiếp mã enum của backend (PENDING, DELIVERING...) ra UI.
 */
export const ORDER_STATUS_META = {
    PENDING: {
        label: 'Chờ xác nhận',
        title: 'Đơn hàng đang chờ xác nhận',
        message: (code) => `Đơn hàng ${code} đang chờ tiệm xác nhận.`,
        icon: 'clock',
        tone: 'bg-amber-100 text-amber-700',
    },
    CONFIRMED: {
        label: 'Đã xác nhận',
        title: 'Tiệm đã xác nhận đơn hàng',
        message: (code) => `Tiệm đã xác nhận đơn hàng ${code} của bạn.`,
        icon: 'badgeCheck',
        tone: 'bg-sky-100 text-sky-700',
    },
    PICKING_UP: {
        label: 'Đang đến lấy đồ',
        title: 'Tiệm đang đến lấy đồ',
        message: (code) => `Nhân viên tiệm đang trên đường đến lấy đồ cho đơn ${code}.`,
        icon: 'truck',
        tone: 'bg-violet-100 text-violet-700',
    },
    RECEIVED: {
        label: 'Tiệm đã nhận đồ',
        title: 'Tiệm đã nhận đồ của bạn',
        message: (code) => `Tiệm đã nhận đồ của đơn ${code} và sẽ sớm tiến hành giặt.`,
        icon: 'inbox',
        tone: 'bg-indigo-100 text-indigo-700',
    },
    PROCESSING: {
        label: 'Đang giặt',
        title: 'Đồ của bạn đang được giặt',
        message: (code) => `Đơn hàng ${code} đang được giặt sấy.`,
        icon: 'sparkles',
        tone: 'bg-cyan-100 text-cyan-700',
    },
    READY: {
        label: 'Đã giặt xong',
        title: 'Đồ đã giặt xong',
        message: (code) => `Đơn hàng ${code} đã giặt xong và sẵn sàng để nhận.`,
        icon: 'package',
        tone: 'bg-teal-100 text-teal-700',
    },
    DELIVERING: {
        label: 'Đang giao hàng',
        title: 'Đơn hàng đang được giao',
        message: (code) => `Đơn hàng ${code} đang được giao đến bạn.`,
        icon: 'truck',
        tone: 'bg-blue-100 text-blue-700',
    },
    COMPLETED: {
        label: 'Hoàn thành',
        title: 'Đơn hàng đã hoàn thành',
        message: (code) => `Đơn hàng ${code} đã hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ!`,
        icon: 'checkCircle',
        tone: 'bg-emerald-100 text-emerald-700',
    },
    CANCELLED: {
        label: 'Đã hủy',
        title: 'Đơn hàng đã bị hủy',
        message: (code) => `Đơn hàng ${code} đã bị hủy.`,
        icon: 'xCircle',
        tone: 'bg-rose-100 text-rose-700',
    },
};

export const getOrderStatusLabel = (status) => ORDER_STATUS_META[status]?.label || 'Đang cập nhật';

// Định dạng cũ do backend sinh: "Đơn hàng #ORD-0001 đã chuyển sang trạng thái: COMPLETED"
const LEGACY_STATUS_REGEX = /(#?ORD-\d+).*?trạng thái:\s*([A-Z_]+)/i;
// Bất kỳ mã enum nào còn sót lại trong chuỗi
const ENUM_TOKEN_REGEX = new RegExp(`\\b(${Object.keys(ORDER_STATUS_META).join('|')})\\b`, 'g');

const GENERIC_RULES = [
    { test: /đơn (hàng )?mới/i, icon: 'bag', tone: 'bg-teal-100 text-teal-700' },
    { test: /khiếu nại|tranh chấp|đền bù|hoàn tiền/i, icon: 'shield', tone: 'bg-orange-100 text-orange-700' },
    { test: /thanh toán|chuyển khoản|payos/i, icon: 'card', tone: 'bg-emerald-100 text-emerald-700' },
    { test: /đánh giá/i, icon: 'star', tone: 'bg-amber-100 text-amber-700' },
    { test: /hủy/i, icon: 'xCircle', tone: 'bg-rose-100 text-rose-700' },
];

/**
 * Chuẩn hoá một thông báo để hiển thị: tiêu đề/nội dung tiếng Việt tự nhiên + icon trạng thái.
 * Tương thích ngược với các thông báo cũ đã lưu trong DB còn chứa mã enum thô.
 */
export const describeNotification = (notif = {}) => {
    const rawTitle = notif.title || '';
    const rawMessage = notif.message || '';

    // 1. Thông báo cũ có chứa enum -> viết lại hoàn toàn
    const legacy = rawMessage.match(LEGACY_STATUS_REGEX);
    if (legacy) {
        const code = legacy[1].startsWith('#') ? legacy[1] : `#${legacy[1]}`;
        const meta = ORDER_STATUS_META[legacy[2].toUpperCase()];
        if (meta) {
            return { title: meta.title, message: meta.message(code), icon: meta.icon, tone: meta.tone };
        }
    }

    // 2. Thông báo mới: nhận diện trạng thái qua tiêu đề do backend sinh
    const byTitle = Object.values(ORDER_STATUS_META).find(m => m.title === rawTitle);
    const safeMessage = rawMessage.replace(ENUM_TOKEN_REGEX, (m) => ORDER_STATUS_META[m]?.label.toLowerCase() || m);
    if (byTitle) {
        return { title: rawTitle, message: safeMessage, icon: byTitle.icon, tone: byTitle.tone };
    }

    // 3. Các loại thông báo khác (đơn mới, khiếu nại, thanh toán...)
    const haystack = `${rawTitle} ${rawMessage}`;
    const rule = GENERIC_RULES.find(r => r.test.test(haystack));
    return {
        title: rawTitle || 'Thông báo',
        message: safeMessage,
        icon: rule?.icon || 'bell',
        tone: rule?.tone || 'bg-slate-100 text-slate-600',
    };
};
