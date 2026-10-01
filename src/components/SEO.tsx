import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  type?: string;
  image?: string;
  url?: string;
  jsonLd?: Record<string, any>;
}

const DEFAULT_TITLE = 'Cátedra IA – Banco de Ejercicios y Resoluciones Paso a Paso';
const DEFAULT_DESCRIPTION =
  'Plataforma universitaria para resolver y consultar ejercicios paso a paso con IA, metodologías por cátedra y fórmulas en LaTeX.';
const SITE_NAME = 'Cátedra IA';

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  type = 'website',
  image,
  url,
  jsonLd,
}) => {
  const fullTitle = title ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`) : DEFAULT_TITLE;
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalApplication',
    name: 'Cátedra IA',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'All',
    description: DEFAULT_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ARS',
    },
  };

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* OpenGraph Tags */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {image && <meta property="og:image" content={image} />}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      {/* Schema.org Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd || defaultStructuredData)}
      </script>
    </Helmet>
  );
};
