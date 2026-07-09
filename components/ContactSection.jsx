'use client';

import { useState } from 'react';
import { Mail, Phone, MessageCircle, Copy } from 'lucide-react';
import { AppIcon } from './Icon';

async function writeClipboardText(value) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.inset = '0 auto auto 0';
  textArea.style.width = '1px';
  textArea.style.height = '1px';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, value.length);

  const didCopy = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!didCopy) {
    throw new Error('Copy command failed');
  }
}

export function ContactSection({ profile }) {
  const [copiedKey, setCopiedKey] = useState('');

  const copyText = async (key, value) => {
    try {
      await writeClipboardText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(''), 1600);
    } catch {
      setCopiedKey('');
      window.prompt('请手动复制', value);
    }
  };

  return (
    <section className="contact-section section-shell" id="contact">
      <div className="section-kicker">CONTACT</div>
      <div className="contact-layout">
        <div>
          <h2>联系我 / CONTACT</h2>
          <p>
            适合商业影像、品牌视觉、活动摄影、视频后期与 AI 辅助创意工作流相关岗位或合作沟通。
          </p>
        </div>
        <div className="contact-card">
          <ContactRow
            icon={<AppIcon icon={Phone} size="sm" />}
            href={`tel:${profile.phone}`}
            label={profile.phone}
            prefix="电话"
            copied={copiedKey === 'phone'}
            onCopy={() => copyText('phone', profile.phone)}
          />
          <ContactRow
            icon={<AppIcon icon={Mail} size="sm" />}
            href={`mailto:${profile.email}`}
            label={profile.email}
            prefix="邮箱"
            copied={copiedKey === 'email'}
            onCopy={() => copyText('email', profile.email)}
          />
          <ContactRow
            icon={<AppIcon icon={Copy} size="sm" />}
            label={profile.wechat}
            prefix="微信号"
            copied={copiedKey === 'wechat'}
            onCopy={() => copyText('wechat', profile.wechat)}
          />
          <div className="wechat-line">
            <AppIcon icon={MessageCircle} size="sm" />
            <span>微信二维码</span>
          </div>
          <img
            className="wechat-qr"
            src={profile.wechatQr}
            alt="微信二维码"
            width={profile.wechatQrWidth ?? 512}
            height={profile.wechatQrHeight ?? 512}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}

function ContactRow({ icon, href, label, prefix, copied, onCopy }) {
  const content = (
    <>
      <span className="contact-row-main">
        {icon}
        <span>{prefix ? `${prefix}：${label}` : label}</span>
      </span>
    </>
  );

  return (
    <div className="contact-row">
      {href ? <a href={href}>{content}</a> : <span>{content}</span>}
      <button type="button" className="copy-action" onClick={onCopy}>
        {copied ? '已复制' : '复制'}
      </button>
    </div>
  );
}
