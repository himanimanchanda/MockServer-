const Section = ({ title, children }: any) => {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <h2 className="text-base font-semibold mb-4 text-slate-800">{title}</h2>
      {children}
    </div>
  );
};

export default Section;