import Link from 'next/link';

const categories = [
  { name: 'Dragons', search: 'dragon' },
  { name: 'Sea Creatures', search: 'narwhal' },
  { name: 'Wild Animals', search: 'racoon' },
  { name: 'Dinosaurs', search: 'dino' },
  { name: 'Farm Animals', search: 'cow' },
  { name: 'All Products', search: '' },
];

export const Footer = ({}) => {
  return (
    <footer className="text-center gap-8 grid grid-cols-1 rounded bg-black p-10 text-white">
      <div className="grid grid-cols-1">
        <Link href="/">
          <h2 className="text-2xl font-bold">Moonafique</h2>
        </Link>
      </div>
      <div className="grid grid-cols-1">
        <h3 className="text-lg font-semibold mb-4">Categories</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/?search=${encodeURIComponent(category.search)}`}
              className="text-gray-300 hover:text-white transition-colors duration-200"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1">
        <h3 className="text-lg font-semibold mb-4">Legal</h3>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/privacy"
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Terms of Service
          </Link>
          <Link
            href="/cookies"
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Cookie Policy
          </Link>
          <Link
            href="/refund"
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Refund Policy
          </Link>
          <Link
            href="/shipping"
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Shipping Policy
          </Link>
          <Link
            href="/quality"
            className="text-gray-300 hover:text-white transition-colors duration-200"
          >
            Quality Policy
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1">
        <p>
          © {new Date().getFullYear()} - All right reserved by Moonafique LLC
        </p>
      </div>
      <div className="col-span-1 flex justify-center gap-4">
        <a
          href="https://www.tiktok.com/@moonafique"
          target="blank"
          rel="noreferrer noopener"
          className="hover:opacity-80 transition-opacity duration-200"
        >
          <svg
            fill="#ffffff"
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            xmlSpace="preserve"
          >
            <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
          </svg>
        </a>
        <a
          href="https://www.facebook.com/profile.php?id=61567210106767"
          target="blank"
          rel="noreferrer noopener"
          className="hover:opacity-80 transition-opacity duration-200"
        >
          <svg
            width="24px"
            height="24px"
            viewBox="0 0 266.895 266.895"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M252.164 266.895c8.134 0 14.729-6.596 14.729-14.73V14.73c0-8.137-6.596-14.73-14.729-14.73H14.73C6.593 0 0 6.594 0 14.73v237.434c0 8.135 6.593 14.73 14.73 14.73h237.434z"
              fill="#485a96"
            />
            <path
              d="M184.152 266.895V163.539h34.692l5.194-40.28h-39.887V97.542c0-11.662 3.238-19.609 19.962-19.609l21.329-.01V41.897c-3.689-.49-16.351-1.587-31.08-1.587-30.753 0-51.807 18.771-51.807 53.244v29.705h-34.781v40.28h34.781v103.355h41.597z"
              fill="#ffffff"
            />
          </svg>
        </a>
      </div>
    </footer>
  );
};
