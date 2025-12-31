import React, { useEffect, useRef } from 'react';

function ContentTab({ postData, setPostData }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current && postData) {
      textareaRef.current.value = postData.content || '';
    }
  }, [postData]);

  const handleChange = (e) => {
    setPostData(prev => ({ ...prev, content: e.target.value }));
  };

  return (
    <div className="tab-content active" id="content-tab">
      <textarea
        ref={textareaRef}
        id="contentEditor"
        className="editor-textarea"
        placeholder="Write your content here..."
        onChange={handleChange}
      />
    </div>
  );
}

export default ContentTab;
