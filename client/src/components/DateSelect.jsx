import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRightCircleIcon } from "lucide-react";
import BlurCode from "./BlurCode";

function DateSelect({ dateTime, id }) {
  const navigate = useNavigate();
  // Store the selected date string (default to the first available date)
  const [selectedDate, setSelectedDate] = useState(
    dateTime ? Object.keys(dateTime)[0] : null
  );

  const handleBooking = () => {
    if (!selectedDate) return;
    // Navigate to your booking/seat selection screen with the selected date & movie ID
    navigate(`/buy-tickets/${id}/${selectedDate}`);
  };

  return (
    <div id="dateSelect" className="pt-30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative p-8 bg-primary/10 border border-primary/20 rounded-lg">
        <BlurCode top="-100px" left="-100px" />
        <BlurCode top="100px" right="0px" />
        <div>
          <p className="text-lg font-semibold">Choose Date</p>
          <div className="flex items-center gap-6 text-sm mt-5">
            <ChevronLeft width={28} className="cursor-pointer" />
            <span className="grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4">
              {dateTime &&
                Object.keys(dateTime).map((date) => {
                  const isSelected = selectedDate === date;

                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`flex flex-col items-center justify-center h-14 w-14 aspect-square rounded cursor-pointer transition-all ${
                        isSelected
                          ? "bg-primary text-white font-bold scale-105"
                          : "bg-gray-800/40 hover:bg-gray-700/50 text-gray-300"
                      }`}
                    >
                      <span>{new Date(date).getDate()}</span>
                      <span className="text-xs">
                        {new Date(date).toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                    </button>
                  );
                })}
            </span>
            <ChevronRightCircleIcon width={28} className="cursor-pointer" />
          </div>
        </div>
        
      <button
        onClick={handleBooking}
        disabled={!selectedDate}
        className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
      >
        Book Now
      </button>
      </div>

    </div>
  );
}

export default DateSelect;

/* 2:38:55*/  