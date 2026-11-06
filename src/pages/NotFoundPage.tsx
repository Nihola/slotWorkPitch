import { Link } from 'react-router-dom'
import { t } from '../i18n'
export default function NotFoundPage() {
  return <div className="py-20 text-center"><h1 className="text-3xl font-extrabold">{t("We couldn't find that page.")}</h1><Link to="/" className="mt-4 inline-block font-bold text-brandfg">{t('Go home')}</Link></div>
}
