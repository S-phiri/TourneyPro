import React from 'react';

interface MarkdownProps {
  content: string;
  className?: string;
}

const Markdown: React.FC<MarkdownProps> = ({ content, className = '' }) => {
  if (!content) {
    return null;
  }

  // Simple markdown-like rendering for basic formatting
  const formatContent = (text: string) => {
    return text
      // Bold text **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // Italic text *text* or _text_
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br />');
  };

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: formatContent(content) }}
    />
  );
};

export default Markdown;
