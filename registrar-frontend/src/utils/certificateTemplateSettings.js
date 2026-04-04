import puplogoimage from "../assets/puplogoimage.png";
import bagongPilipinasLogo from "../assets/Bagong_Pilipinas_logo.png";
import certificateFooter from "../assets/certificate_footer.png";

export const CERT_TEMPLATE_LAYOUT_CHANGED = "certificate-template-layout-changed";

export const DEFAULT_CERTIFICATE_LAYOUT = {
	headerLeftUrl: puplogoimage,
	headerRightUrl: bagongPilipinasLogo,
	footerUrls: [certificateFooter],
	headerLogoSize: 56,
	footerLogoSize: 56,
};

const coerceSize = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeUrlArray = (value) => {
	if (!Array.isArray(value)) return [];
	return value.filter((item) => typeof item === "string" && item.trim().length > 0);
};

export const normalizeCertificateLayout = (rawLayout) => {
	if (!rawLayout || typeof rawLayout !== "object") {
		return { ...DEFAULT_CERTIFICATE_LAYOUT };
	}

	const headerLeftUrl = rawLayout.layout_header_left_url ?? rawLayout.headerLeftUrl ?? DEFAULT_CERTIFICATE_LAYOUT.headerLeftUrl;
	const headerRightUrl = rawLayout.layout_header_right_url ?? rawLayout.headerRightUrl ?? DEFAULT_CERTIFICATE_LAYOUT.headerRightUrl;
	const footerUrls = normalizeUrlArray(rawLayout.layout_footer_urls ?? rawLayout.footerUrls);

	return {
		headerLeftUrl,
		headerRightUrl,
		footerUrls: footerUrls.length ? footerUrls : [...DEFAULT_CERTIFICATE_LAYOUT.footerUrls],
		headerLogoSize: coerceSize(
			rawLayout.layout_header_logo_size ?? rawLayout.headerLogoSize,
			DEFAULT_CERTIFICATE_LAYOUT.headerLogoSize
		),
		footerLogoSize: coerceSize(
			rawLayout.layout_footer_logo_size ?? rawLayout.footerLogoSize,
			DEFAULT_CERTIFICATE_LAYOUT.footerLogoSize
		),
	};
};

export const toLayoutPayload = (layout) => {
	const normalized = normalizeCertificateLayout(layout);
	return {
		layout_header_left_url: normalized.headerLeftUrl,
		layout_header_right_url: normalized.headerRightUrl,
		layout_footer_urls: normalized.footerUrls,
		layout_header_logo_size: normalized.headerLogoSize,
		layout_footer_logo_size: normalized.footerLogoSize,
	};
};
