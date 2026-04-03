import React from 'react';

const ItemCard = ({ item }) => {
  return (
    <div className="p-4 bg-white border rounded shadow-sm flex items-center hover:bg-gray-50 cursor-pointer">
      <div className="flex-1">
        <h4 className="font-medium">{item.name}</h4>
        <p className="text-sm text-gray-500">{item.username}</p>
      </div>
      <button className="p-2 text-blue-600 hover:text-blue-800">
        Fill
      </button>
    </div>
  );
};

export default ItemCard;
