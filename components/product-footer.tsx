'use client';
import type { Manifest } from '@gifters/config';
import { useAppearance } from './appearance-provider';
export default function ProductFooter({ content, help }: { content: Manifest['product_content']; help: boolean }) {
  const { locale } = useAppearance(), suffix = '?locale='+locale;
  return <footer><span>{content.tagline[locale]}</span>{help && <span>
    <a href={'/how-it-works' + suffix}>{locale === 'fr' ? 'Comment ça marche' : 'How it works'}</a> · <a href={'/terms' + suffix}>{locale === 'fr' ? 'Conditions' : 'Terms'}</a> · <a href={'/privacy' + suffix}>{locale === 'fr' ? 'Confidentialité' : 'Privacy'}</a>
  </span>}</footer>;
}
