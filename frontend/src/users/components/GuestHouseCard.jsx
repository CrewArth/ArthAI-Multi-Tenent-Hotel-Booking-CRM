import React, { useEffect } from "react";
import "../styles/guestHouseCard.css";
import { FaMapMarkerAlt, FaTools } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchGuestHouses } from "../../redux/guestHouseSlice";

const GuestHouseCard = ({ showOnlyThree = false }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data: guestHouses, loading, error } = useSelector(
    (state) => state.guestHouses
  );

  useEffect(() => {
    if (!guestHouses || guestHouses.length === 0) {
      dispatch(fetchGuestHouses());
    }
  }, [dispatch]);

  const redirectBookingForm = (house) => {
    navigate("/booking", { state: { guestHouse: house } });
  };

  if (loading) return <p>Loading hotels...</p>;
  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;
  if (!guestHouses || guestHouses.length === 0)
    return <p>No hotels found.</p>;

  // Slice guest houses if we want only 3 for homepage
  const displayHouses = showOnlyThree
    ? guestHouses.slice(0, 4)
    : guestHouses;

  return (
    <section className="featured-guest-house-section">
      <h2 className="featured-title">Featured Hotels</h2>
      <div className="guest-house-grid">
        {displayHouses.map((house) => (
          <div
            key={house._id || house.guestHouseId}
            className="guest-house-card"
          >
            <div className="card-image">
              <img
                src={
                  house.image ||
                  "https://via.placeholder.com/600x360?text=Hotel"
                }
                alt={house.guestHouseName}
              />
              {house.maintenance && (
                <div className="maintenance-badge">
                  <FaTools /> Under Maintenance
                </div>
              )}
            </div>

            <div className="card-content">
              <h3 className="house-name">{house.guestHouseName}</h3>
              <p className="location">
                <FaMapMarkerAlt />
                {house.location?.city}, {house.location?.state}
              </p>
              <p className="description">
                {house.description || "No description available."}
              </p>

              <button
                className={`book-button ${
                  house.maintenance ? "disabled" : ""
                }`}
                disabled={house.maintenance}
                onClick={() => redirectBookingForm(house)}
              >
                {house.maintenance ? "Currently Unavailable" : "Book Now"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default GuestHouseCard;
