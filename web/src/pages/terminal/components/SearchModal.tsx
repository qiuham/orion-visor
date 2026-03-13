import { useRef, useEffect } from 'react';
import {
  SearchOutlined,
  UpOutlined,
  DownOutlined,
  CloseOutlined,
} from '@ant-design/icons';

interface SearchModalProps {
  onSearch: (word: string, next: boolean) => void;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ onSearch, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const word = inputRef.current?.value || '';
      if (word) {
        onSearch(word, !e.shiftKey);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="terminal-search-modal">
      <SearchOutlined style={{ fontSize: 14, opacity: 0.6 }} />
      <input
        ref={inputRef}
        placeholder="搜索..."
        onKeyDown={handleKeyDown}
      />
      <button
        title="上一个"
        onClick={() => {
          const word = inputRef.current?.value || '';
          if (word) onSearch(word, false);
        }}
      >
        <UpOutlined />
      </button>
      <button
        title="下一个"
        onClick={() => {
          const word = inputRef.current?.value || '';
          if (word) onSearch(word, true);
        }}
      >
        <DownOutlined />
      </button>
      <button title="关闭" onClick={onClose}>
        <CloseOutlined />
      </button>
    </div>
  );
};

export default SearchModal;
