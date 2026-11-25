import type { FC } from "react";

const Header: FC = () => {
  return (
    <>
      <h1
        className="relative w-full max-w-full select-none px-1 pt-0 text-center break-words xl:absolute xl:left-[443px] xl:top-0 xl:w-[calc(100%-905px)] xl:p-0 xl:text-left xl:whitespace-nowrap 2xl:left-[439px] 2xl:w-[637px]"
        style={{
          fontFamily: "Josefin Sans",
          fontWeight: 400,
          fontSize: 22,
          lineHeight: "1.3",
          color: "rgba(255, 255, 255, 1)",
          margin: 0,
        }}
      >
        Interview: Arjun Sharma ( Software Engineer )
      </h1>

      <p
        className="relative mt-1 w-full max-w-full select-none px-1 text-center break-words xl:absolute xl:left-[443px] xl:top-[35px] xl:mt-0 xl:w-[319px] xl:p-0 xl:text-left xl:whitespace-nowrap 2xl:left-[439px] 2xl:w-[319px]"
        style={{
          fontFamily: "Poppins",
          fontWeight: 400,
          fontSize: 15,
          lineHeight: "22px",
          color: "rgba(255, 206, 165, 0.8)",
          margin: 0,
        }}
      >
        AI Interviewer evaluating Candidate
      </p>
    </>
  );
};

export default Header;
