import React, { useState } from 'react';

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    onSearch(searchTerm);
  };

  return (
    <div className="text-center items-center mt-2 font-logo">
      <input
        type="text"
        placeholder="Cari resep..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="text-center mr-2 px-2 py-2 border border-black rounded-l-full focus:outline-none"
      />
      <button
        onClick={handleSearch}
        className="bg-amber-500 text-center px-2 py-2 border border-black rounded-r-full hover:bg-blue-600 focus:outline-none"
      >
        Cari
      </button>
    </div>
  );
};

export default SearchBar;
