const alfy = require("alfy");
const pify = require("pify");
const xml2js = require("xml2js");

const parseString = pify(xml2js.parseString);

const noResults = () => alfy.output([{
    title: `No results found for '${alfy.input}'`,
    subtitle: `Search Goodreads for '${alfy.input}'`,
    arg: `https://www.goodreads.com/search?q=${encodeURIComponent(alfy.input)}`
}]);

const averageRating = rawBook =>
    typeof rawBook.average_rating[0] === "object"
        ? rawBook.average_rating[0]._
        : rawBook.average_rating[0];

function ratingText(averageRating) {
    const rating = Math.round(averageRating);
    const fill = 5 - rating;
    const stars = `${"★".repeat(rating)}${"☆".repeat(fill)}`;
    return `${stars} (${averageRating})`;
}

const findBooks = (name) =>
    alfy.fetch("https://www.goodreads.com/search/index.xml", {
        query: {q: name, key: "YVABuJSFNNFq65uTzRA8Nw"},
        json: false,
        transform: body =>
            parseString(body).then(
                body => body.GoodreadsResponse.search[0].results[0].work
            )
    });

const parseBooks = (rawBooks) => rawBooks.map(book => {
    const {best_book} = book;
    // this looks like garbage (and it is), but is necessary thanks to xml2js,
    // but it beats dealing with XML directly!

    const id = best_book[0].id[0]._;
    return {
        title: best_book[0].title[0],
        authors: best_book[0].author.map(it => it.name),
        averageRating: averageRating(book),
        link: `http://goodreads.com/book/show/${id}`
    };
})


function getSubtitle(book) {
    return `by ${book.authors[0]} | ${ratingText(book.averageRating)}`;
}

const bookToMarkdown = (book) =>
    `- [[${book.title}]]
  - metadata::
    - page_type::[[book]]
    - author::${book.authors.map(it => `[[${it}]]`).join(" ")}     
      - page_type::[[person]] [[author]]
    - link::${book.link}
    - recommendation::
    `

const index = alfy.input.indexOf(" ")
const command = alfy.input.substr(0, index)
const searchString = alfy.input.substr(index + 1)

findBooks(searchString).then(books => {
    if (books === undefined) {
        return noResults();
    }

    const items = parseBooks(books).map(book => ({
        title: book.title,
        subtitle: getSubtitle(book),
        arg: command === "copy" ? bookToMarkdown(book) : book.link
    }));

    alfy.output(items);
});
