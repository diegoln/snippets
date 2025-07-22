/**
 * Markdown Renderer Component
 * 
 * Renders markdown content with syntax highlighting and GitHub Flavored Markdown support.
 * Used for both weekly snippets and performance drafts.
 */

'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Custom components for markdown rendering with AdvanceWeekly design system
 */
const markdownComponents = {
  // Headings
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="text-heading-1 text-primary mb-4 border-b border-neutral-600/20 pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="text-heading-2 text-primary mb-3 mt-6">
      {children}
    </h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-medium text-secondary mb-2 mt-4">
      {children}
    </h3>
  ),
  
  // Paragraphs
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="text-body text-neutral-900 mb-3">
      {children}
    </p>
  ),
  
  // Lists
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="list-disc list-inside text-neutral-900 mb-3 space-y-1">
      {children}
    </ul>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <ol className="list-decimal list-inside text-neutral-900 mb-3 space-y-1">
      {children}
    </ol>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="ml-2">
      {children}
    </li>
  ),
  
  // Code blocks and inline code
  code: ({ inline, className, children }: { 
    inline?: boolean
    className?: string
    children: React.ReactNode 
  }) => {
    if (inline) {
      return (
        <code className="bg-neutral-100 text-neutral-900 px-1.5 py-0.5 rounded text-mono font-mono">
          {children}
        </code>
      )
    }
    
    return (
      <code className={`${className || ''} block bg-neutral-100 p-3 rounded-card text-mono font-mono overflow-x-auto`}>
        {children}
      </code>
    )
  },
  
  pre: ({ children }: { children: React.ReactNode }) => (
    <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-card overflow-x-auto mb-4">
      {children}
    </pre>
  ),
  
  // Blockquotes
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <blockquote className="border-l-4 border-primary-600 pl-4 py-2 mb-4 bg-primary-100 italic text-secondary">
      {children}
    </blockquote>
  ),
  
  // Links
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <a 
      href={href} 
      className="text-primary-600 hover:text-primary-600/80 underline transition-advance"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  
  // Horizontal rule
  hr: () => (
    <hr className="border-0 border-t border-neutral-600/20 my-6" />
  ),
  
  // Tables
  table: ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border border-neutral-600/20 rounded-card">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-neutral-100">
      {children}
    </thead>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <th className="border border-neutral-600/20 px-4 py-2 text-left font-semibold text-secondary">
      {children}
    </th>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <td className="border border-neutral-600/20 px-4 py-2 text-neutral-900">
      {children}
    </td>
  ),
  
  // Task lists (GitHub Flavored Markdown)
  input: ({ checked, type }: { checked?: boolean; type?: string }) => {
    if (type === 'checkbox') {
      return (
        <input 
          type="checkbox" 
          checked={checked} 
          readOnly 
          className="mr-2 accent-accent-500"
        />
      )
    }
    return <input type={type} />
  }
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer