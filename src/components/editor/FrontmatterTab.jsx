import React from 'react';

function FrontmatterTab({ postData, setPostData }) {
  const frontmatter = postData?.frontmatter || {};
  const fields = Object.keys(frontmatter);

  if (fields.length === 0) {
    return (
      <div className="tab-content active" id="frontmatter-tab">
        <div className="frontmatter-editor">
          <p className="empty-state">No frontmatter fields</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-content active" id="frontmatter-tab">
      <div className="frontmatter-editor" id="frontmatterEditor">
        {fields.map(key => {
          const value = frontmatter[key];
          const isBoolean = typeof value === 'boolean';
          const isArray = Array.isArray(value);
          const isObject = typeof value === 'object' && value !== null && !isArray;
          
          if (isBoolean) {
            return (
              <div key={key} className="form-group">
                <label>
                  <input
                    type="checkbox"
                    data-key={key}
                    defaultChecked={value}
                  />
                  {key}
                </label>
              </div>
            );
          } else if (isArray) {
            return (
              <div key={key} className="form-group">
                <label>{key}:</label>
                <textarea
                  data-key={key}
                  placeholder="One item per line"
                  defaultValue={value.join('\n')}
                />
              </div>
            );
          } else if (isObject) {
            return (
              <div key={key} className="form-group">
                <label>{key}:</label>
                <textarea
                  data-key={key}
                  placeholder="JSON object"
                  defaultValue={JSON.stringify(value, null, 2)}
                />
              </div>
            );
          } else {
            return (
              <div key={key} className="form-group">
                <label>{key}:</label>
                <input
                  type="text"
                  data-key={key}
                  defaultValue={String(value)}
                />
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}

export default FrontmatterTab;
