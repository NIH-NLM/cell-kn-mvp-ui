import { formatFieldValue, getDisplayFields, getSectionedFields, getTitle, getUrl } from "utils";

/**
 * Renders a structured inspector card for a single document.
 * For collections with a UI section config, renders titled Overview/Metadata/
 * Provenance sections; otherwise renders a single flat Overview table.
 * @param {object} props
 * @param {object} props.document - The document data object to display.
 */
const DocumentCard = ({ document }) => {
  const sections = getSectionedFields(document);

  /**
   * Renders a field's value, as an external link when it carries a URL.
   * @param {object} field - { value, url }
   */
  const renderValue = (field) =>
    field.url ? (
      <a href={field.url} target="_blank" rel="noopener noreferrer" className="external-link">
        {formatFieldValue(field.value)}
      </a>
    ) : (
      formatFieldValue(field.value)
    );

  // Sectioned path (configured collections, e.g. CSD).
  if (sections && sections.length > 0) {
    return (
      <div className="document-item-list-wrapper inspector-card">
        <h3 className="inspector-card-title">{getTitle(document)}</h3>
        {sections.map(({ section, fields }) => {
          const descriptions = fields.filter((f) => f.variant === "description");
          const rows = fields.filter((f) => f.variant !== "description");
          return (
            <section className="inspector-section" key={section}>
              <h4 className="inspector-section-title">{section}</h4>
              {descriptions.map((f) => (
                <p className="inspector-section-description" key={f.key}>
                  {formatFieldValue(f.value)}
                </p>
              ))}
              {rows.length > 0 && (
                <table className="document-attributes-table">
                  <tbody>
                    {rows.map((field) => (
                      <tr key={field.key}>
                        <td className="attribute-key wrap">{field.label}</td>
                        <td className="attribute-value wrap">{renderValue(field)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  // Flat fallback (collections without a section config).
  const url = getUrl(document);
  const legendContent = document._id.replace("/", "_");
  const displayFields = getDisplayFields(document);
  return (
    <div className="document-item-list-wrapper inspector-overview">
      <h3 className="inspector-overview-title">Overview</h3>
      <fieldset className="document-info-fieldset">
        <legend className="document-info-legend">
          {/* Render legend as link only if primary URL exists. */}
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="external-link document-id-link"
            >
              {legendContent}
            </a>
          ) : (
            <span>{legendContent}</span>
          )}
        </legend>
        <table className="document-attributes-table">
          <tbody>
            {displayFields.map((field) => (
              <tr key={field.key}>
                <td className="attribute-key wrap">{field.label}</td>
                <td className="attribute-value wrap">{renderValue(field)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
    </div>
  );
};

export default DocumentCard;
