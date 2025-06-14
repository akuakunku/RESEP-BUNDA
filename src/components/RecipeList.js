import React, { useEffect, useState } from "react";
import { db } from "../services/firebase";
import SearchBar from "./SearchBar";
import { Link } from "react-router-dom";
import { FaChevronLeft, FaChevronRight, FaStar } from "react-icons/fa";
import DefaultImage from "../assets/profile.svg";
import BeatLoader from "react-spinners/BeatLoader";
import "../styles/tailwind.css";

const RecipeList = () => {
  const [recipes, setRecipes] = useState([]);
  const currentYear = new Date().getFullYear();
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCreator, setSelectedCreator] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [slideIndex, setSlideIndex] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isRecipesLoading, setIsRecipesLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const categories = [
    "Sarapan",
    "Makan Siang",
    "Makan Malam",
    "Camilan",
    "Seafood",
    "Hidangan Pembuka",
    "Hidangan Utama",
    "Hidangan Penutup",
    "Kue/Roti",
    "Minuman",
    "Hidangan Tradisional",
    "Hidangan Sehat",
    "Hidangan Vegetarian",
  ];

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setIsRecipesLoading(true);
        setFetchError(null);

        let query = db.collection("recipes");

        if (selectedCategory !== "") {
          query = query.where("category", "==", selectedCategory);
        }

        if (selectedCreator !== "") {
          query = query.where("author", "==", selectedCreator);
        }

        if (selectedTitle !== "") {
          query = query.where("title", "==", selectedTitle);
        }

        const snapshot = await query.limit(12).get();

        if (snapshot.docs.length === 0) {
          setIsRecipesLoading(true);
          return;
        }

        const recipesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        }));

        const usersSnapshot = await db.collection("users").get();
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const recipesWithCreator = recipesData.map((recipe) => {
          const creator = usersData.find((user) => user.id === recipe.authorId);
          return {
            ...recipe,
            creatorPhoto: creator?.photoURL || DefaultImage,
          };
        });

        setRecipes(recipesWithCreator);
        setFilteredRecipes(recipesWithCreator);
      } catch (error) {
        console.error("Error fetching recipes:", error);
        setFetchError("An error occurred while fetching recipes.");
      } finally {
        setIsRecipesLoading(false);
      }
    };

    const fetchRecommendations = async () => {
      try {
        
        let query = db.collection("recipes");

        if (sortBy) {
          query = query.orderBy(sortBy);
        }

        const lastRecommendation = recommendations[recommendations.length - 1];
        if (lastRecommendation) {
          query = query
            .orderBy("createdAt")
            .startAfter(lastRecommendation.createdAt);
        }

        const snapshot = await query.limit(12).get();

        if (snapshot.docs.length === 0) {
          
          return;
        }

        const recommendationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        }));

        setRecommendations(recommendations.concat(recommendationsData));
      } catch (error) {
        console.error("Error fetching recommendation recipes:", error);
      } finally {
      
      }
    };

    fetchRecipes();
    fetchRecommendations();
  }, [
    pageNumber,
    sortBy,
    selectedCategory,
    selectedCreator,
    selectedTitle,
    recommendations,
    setPageNumber,
    searchTerm,
    setSortBy,
  ]);

  const handleSearch = (searchTerm) => {
    setSearchTerm(searchTerm);
    const filtered = recipes.filter((recipe) =>
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRecipes(filtered);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    const filtered = category
      ? recipes.filter(
        (recipe) => recipe.category.toLowerCase() === category.toLowerCase()
      )
      : recipes;

    setFilteredRecipes(filtered);
  };

  const handleCreatorChange = (author) => {
    const allCreatorsOption = "All Creators";
    setSelectedCreator(author === allCreatorsOption ? "" : author);
    const filtered =
      author === allCreatorsOption
        ? recipes
        : recipes.filter((recipe) => author === recipe.author);
    setFilteredRecipes(filtered);
  };

  const handleTitleChange = (title) => {
    setSelectedTitle(title);
    const filtered = title
      ? recipes.filter((recipe) => recipe.title === title)
      : recipes;
    setFilteredRecipes(filtered);
  };

  const handleNextSlide = () => {
    const totalSlides = Math.ceil(filteredRecipes.length / 12);
    setSlideIndex((prevSlideIndex) => (prevSlideIndex + 1) % totalSlides);
  };

  const handlePrevSlide = () => {
    const totalSlides = Math.ceil(filteredRecipes.length / 12);
    setSlideIndex(
      (prevSlideIndex) => (prevSlideIndex - 1 + totalSlides) % totalSlides
    );
  };

  const handleDescriptionToggle = () => {
    setShowFullDescription(
      (prevShowFullDescription) => !prevShowFullDescription
    );
  };

  const startIndex = slideIndex * 12;
  const endIndex = startIndex + 12;

  const currentRecipes = filteredRecipes.slice(startIndex, endIndex);

  const uniqueCreators = [...new Set(recipes.map((recipe) => recipe.author))];

  return (
    <div className="bg-gradient-to-tr from-primary-500 via-wavy-purple to-accent-500">
      {isRecipesLoading ? (
        <div className="flex items-center justify-center font-logo min-h-screen">
          <BeatLoader /> LOADING...
        </div>
      ) : fetchError ? (
        <div>Error: {fetchError}</div>
      ) : (
        <div className="container mx-auto px-4 md:px-4 lg:px-12 xl:px-16">
          <h2 className="text-2xl font-bold text-primary-500 text-center mb-4">
            Resep Masakan
          </h2>
          <p className="text-center mb-2">
            Anda Bisa Request Untuk Penambahan Features
          </p>
          <SearchBar
            onSearch={handleSearch}
            className="text-center py-2 px-2"
          />
          <div className="flex-1 text-center justify-center p-2 mb-4">
            <label htmlFor="sortBy"></label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="ml-2 hover:bg-gray-300 border border-gray-300 text-center rounded focus:outline-none focus:border-blue-500 mb-2 md:mb-0 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              id="creator"
              value={selectedCreator}
              onChange={(e) => handleCreatorChange(e.target.value)}
              className="ml-2 hover:bg-gray-300 border border-gray-300 text-center rounded focus:outline-none focus:border-blue-500 mb-2 md:mb-0 text-sm"
            >
              <option value="">All Creators</option>
              {uniqueCreators.map((creator) => (
                <option key={creator} value={creator}>
                  {creator}
                </option>
              ))}
            </select>
            <select
              id="title"
              value={selectedTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="ml-2 hover:bg-gray-300 border border-gray-300 text-center rounded focus:outline-none focus:border-blue-500 mb-2 md:mb-0 text-sm"
            >
              <option value="">All Titles</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.title}>
                  {recipe.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 text-center item-center">
            {currentRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="rounded-lg shadow-lg-dark bg-secondary-900 hover:bg-secondary-700 border border-secondary-200 p-2 transition-transform transform hover:scale-105"
              >
                <div className="mb-2 text-yellow-500 font-logo">
                  <Link
                    className="block text-xl hover:text-white transition-colors p-2"
                    to={`/recipes/${recipe.id}`}
                  >
                    {recipe.title}
                  </Link>
                </div>
                {recipe.recipeImage && (
                  <div className="mb-4 relative">
                    <Link to={`/recipes/${recipe.id}`}>
                      <img
                        src={recipe.recipeImage}
                        alt="Recipe"
                        className="h-32 md:h-40 w-full object-cover rounded-t"
                      />
                    </Link>
                    <p className="text-sm absolute bottom-0 right-0 mb-2 mr-2 italic">
                      © {currentYear} Resep Masakan
                    </p>
                  </div>
                )}
                <Link to={`/author/${recipe.authorId}`}>
                  <div className="flex flex-row items-center mb-2 ">
                    <img
                      src={recipe.creatorPhoto}
                      alt="Creator"
                      className=" transition-transform transform hover:scale-110 rounded-full border-2 h-8 w-8 object-cover hover:bg-secondary-700 mr-2"
                    />
                    <p className="text-white rounded hover:bg-yellow-700 px-2">
                      {recipe.author}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center justify-center mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, index) => (
                      <FaStar
                        key={index}
                        className={
                          index < Math.floor(recipe.rating)
                            ? "text-yellow-500 mr-1"
                            : index === Math.floor(recipe.rating)
                              ? "text-primary-500 mr-1 opacity-50"
                              : "text-primary-500 mr-1 opacity-50"
                        }
                      />
                    ))}
                  </div>
                </div>
                <div className="mb-4 mt-4 font-bold">
                  <span className="text-sm p-2 text-gray-600 bg-white rounded-full">
                    {recipe.rating}
                  </span>
                </div>
                <p
                  className="mb-2 cursor-pointer text-sm text-yellow-500 font-logo"
                  onClick={() => handleDescriptionToggle()}
                >
                  {showFullDescription
                    ? recipe.description
                    : `${recipe.description.slice(0, 50)}...`}
                </p>
                <p className="mt-2 text-sm text-white">
                  Kategori: {recipe.category}
                </p>
                <p className="text-yellow-600 text-sm">
                  Created: {recipe.createdAt.toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-center font-bold mt-4 p-2">
            <button
              className="px-2 py-2 font-logo rounded-full bg-gray-300 hover:bg-gray-400 transition duration-300 mr-2"
              onClick={handlePrevSlide}
            >
              <FaChevronLeft />
            </button>
            <button
              className="px-2 py-2 font-logo rounded-full bg-gray-300 hover:bg-gray-400 transition duration-300 mr-2"
              onClick={handleNextSlide}
            >
              <FaChevronRight />
            </button>
          </div>
          <div>
            <h1 className="text-center font-bold text-xl">
              Calon Iklan Disini
            </h1>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeList;
