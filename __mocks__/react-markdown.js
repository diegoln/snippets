/**
 * Mock for react-markdown in Jest tests
 */

const ReactMarkdown = ({ children }) => {
  // Simple mock that just renders the content as plain text
  // with some basic markdown parsing for testing
  let content = children || ''
  
  // Convert some basic markdown for testing
  content = content.replace(/## (.*)/g, '<h2>$1</h2>')
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>')
  content = content.replace(/- \[(x| )\] (.*)/g, '<input type="checkbox" $1checked />$2')
  content = content.replace(/- (.*)/g, '<li>$1</li>')
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  content = content.replace(/`([^`]+)`/g, '<code>$1</code>')
  content = content.replace(/> (.*)/g, '<blockquote>$1</blockquote>')
  
  return <div dangerouslySetInnerHTML={{ __html: content }} />
}

export default ReactMarkdown