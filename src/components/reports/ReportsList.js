import React from "react";
import ReportItem from "./ReportItem";

const ReportsList = ({ reports, projects, onEdit, onDelete }) => {
  if (reports.length === 0) {
    return <p>No hay partes que coincidan con los criterios de búsqueda.</p>;
  }

  return (
    <div className="reports-list">
      {reports.map((report) => (
        <ReportItem
          key={report.id}
          report={report}
          project={projects.find(p => p.id === report.projectId) || {}}
          onEdit={() => onEdit(report.id)}
          onDelete={() => onDelete(report.id)}
        />
      ))}
    </div>
  );
};

export default React.memo(ReportsList);