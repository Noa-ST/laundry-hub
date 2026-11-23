package com.laundry.service.impl;

import com.laundry.service.EmailService;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Async
    @Override
    public void sendPasswordResetEmail(String toEmail, String recipientName, String resetToken) {
        String encodedToken = URLEncoder.encode(resetToken, StandardCharsets.UTF_8);
        String encodedEmail = URLEncoder.encode(toEmail, StandardCharsets.UTF_8);
        String resetLink = frontendUrl + "/reset-password?token=" + encodedToken + "&email=" + encodedEmail;
        
        if (mailSender == null || fromEmail == null || fromEmail.trim().isEmpty()) {
            log.warn("=== [DEV/FALLBACK EMAIL] JavaMailSender chưa được cấu hình. Link reset password cho {}: {} ===", toEmail, resetLink);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "Laundry Hub Support");
            helper.setTo(toEmail);
            helper.setSubject("[Laundry Hub] Yêu cầu đặt lại mật khẩu tài khoản");

            String htmlContent = buildResetPasswordHtml(recipientName, resetLink);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Email đặt lại mật khẩu đã gửi thành công tới: {}", toEmail);
        } catch (Exception e) {
            log.error("Không thể gửi email đặt lại mật khẩu tới {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildResetPasswordHtml(String name, String resetLink) {
        String safeName = HtmlUtils.htmlEscape(name != null ? name : "Quý khách");
        String safeLink = HtmlUtils.htmlEscape(resetLink);
        return "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;\">"
                + "<div style=\"text-align: center; margin-bottom: 24px;\">"
                + "<h2 style=\"color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800;\">Laundry Hub</h2>"
                + "<p style=\"color: #64748b; font-size: 13px; margin-top: 4px;\">Nền tảng Giặt sấy tiện lợi & thông minh</p>"
                + "</div>"
                + "<div style=\"padding: 20px; background-color: #f8fafc; border-radius: 12px; margin-bottom: 24px;\">"
                + "<p style=\"font-size: 15px; color: #1e293b; margin: 0 0 12px 0;\">Xin chào <strong>" + safeName + "</strong>,</p>"
                + "<p style=\"font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;\">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Laundry Hub của bạn. Vui lòng bấm vào nút bên dưới để tiến hành đổi mật khẩu mới:</p>"
                + "<div style=\"text-align: center; margin: 24px 0;\">"
                + "<a href=\"" + safeLink + "\" style=\"display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);\">Đặt lại mật khẩu ngay</a>"
                + "</div>"
                + "<p style=\"font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;\">⏰ Link này chỉ có hiệu lực trong vòng <strong>15 phút</strong> vì lý do bảo mật.</p>"
                + "</div>"
                + "<p style=\"font-size: 12px; color: #94a3b8; text-align: center; margin: 0;\">Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email. Mật khẩu của bạn vẫn an toàn tuyệt đối.</p>"
                + "</div>";
    }
}
