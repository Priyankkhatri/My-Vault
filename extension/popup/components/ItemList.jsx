import React from 'react';
import ItemCard from './ItemCard';

const ItemList = ({ items = [] }) => {
  return (
    <div className="item-list mt-4 space-y-2">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
      {items.length === 0 && <p className="text-gray-500 text-center">No items found</p>}
    </div>
  );
};

export default ItemList;
