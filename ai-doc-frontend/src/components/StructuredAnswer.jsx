import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

const StructuredAnswer = ({ answer }) => {
  if (!answer) return null;

  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{answer}</ReactMarkdown>
    </div>
  );
};

export default StructuredAnswer;
