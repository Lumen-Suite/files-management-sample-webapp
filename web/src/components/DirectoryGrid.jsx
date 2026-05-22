import ItemCard from './ItemCard.jsx'

export default function DirectoryGrid({ items, onOpen }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const id = item.id ?? item.Id ?? `${item.Path}/${item.Name}`
        return <ItemCard key={id} item={item} onOpen={onOpen} />
      })}
    </div>
  )
}
